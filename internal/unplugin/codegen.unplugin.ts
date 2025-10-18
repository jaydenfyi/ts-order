import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';

type Ctx = { id: string };
export type CodegenFn = (args: any, ctx: Ctx) => string | Promise<string>;

export type CodegenPluginOptions = {
	generators: Record<string, CodegenFn>;
	includeId?: (id: string) => boolean;
	marker?: string; // default: "codegen"
};

const DEFAULT_INCLUDE = (id: string) => /\.[cm]?[jt]sx?$/.test(id);

export const CodegenPlugin = createUnplugin((opts: CodegenPluginOptions) => {
	const includeId = opts.includeId ?? DEFAULT_INCLUDE;
	const token = opts.marker ?? 'codegen';

	// Single-line:  // @codegen name({...})
	const RE_LINE = new RegExp(
		String.raw`\/\/\s*@${token}\s+([A-Za-z0-9_-]+)\s*(?:\(([\s\S]*?)\))?\s*$`,
		'gm',
	);

	// Region:       // @codegen name:start({...})  ...  // @codegen name:end
	const RE_START = new RegExp(
		String.raw`\/\/\s*@${token}\s+([A-Za-z0-9_-]+):start\s*(?:\(([\s\S]*?)\))?\s*$`,
		'gm',
	);
	const RE_END = new RegExp(
		String.raw`\/\/\s*@${token}\s+([A-Za-z0-9_-]+):end\s*$`,
		'gm',
	);

	const parseArgs = (src?: string) => {
		if (!src) return undefined;
		return JSON.parse(src);
	};

	return {
		name: 'codegen-plugin',
		enforce: 'pre',
		async transform(code, id) {
			if (!includeId(id)) return;

			let mutated = false;
			const s = new MagicString(code);
			const eol = code.includes('\r\n') ? '\r\n' : '\n';

			// ----- Region replacement (idempotent)
			// Scan manually so we can preserve markers and replace the inner span.
			{
				let match: RegExpExecArray | null;
				RE_START.lastIndex = 0;
				// eslint-disable-next-line no-cond-assign
				while ((match = RE_START.exec(code))) {
					const name = match[1];
					const argsRaw = match[2];
					const gen = opts.generators[name];
					if (!gen) continue;

					const startIdx = match.index + match[0].length;
					RE_END.lastIndex = startIdx;
					const endMatch = RE_END.exec(code);
					if (!endMatch || endMatch[1] !== name) continue;

					const innerStart = startIdx;
					const innerEnd = endMatch.index;

					let args: unknown;
					try {
						args = parseArgs(argsRaw);
					} catch {
						// Keep region empty if args are invalid.
						s.update(
							innerStart,
							innerEnd,
							`${eol}// invalid ${token} args${eol}`,
						);
						mutated = true;
						continue;
					}

					const body = await gen(args, { id });
					const startComment = `${eol}// @preserve @${token} ${name}:generated:start${eol}`;
					const endComment = `// @preserve @${token} ${name}:generated:end${eol}`;
					s.update(
						innerStart,
						innerEnd,
						`${startComment}${body}${eol}${endComment}`,
					);
					mutated = true;

					// Keep searching after end marker
					RE_START.lastIndex = endMatch.index + endMatch[0].length;
				}
			}

			// ----- Single-line insertion (append after marker line)
			// Collect matches first to avoid offset issues during edits.
			const lineMatches: Array<{
				name: string;
				argsRaw?: string;
				lineEndPos: number;
			}> = [];
			{
				let m: RegExpExecArray | null;
				RE_LINE.lastIndex = 0;
				// eslint-disable-next-line no-cond-assign
				while ((m = RE_LINE.exec(code))) {
					const name = m[1];
					const argsRaw = m[2];
					const lineEnd = code.indexOf(eol, m.index);
					const pos =
						lineEnd === -1 ? code.length : lineEnd + eol.length;
					lineMatches.push({ name, argsRaw, lineEndPos: pos });
				}
			}

			if (lineMatches.length > 0) {
				// Execute in reverse order to keep earlier positions stable.
				for (let i = lineMatches.length - 1; i >= 0; i--) {
					const { name, argsRaw, lineEndPos } = lineMatches[i];
					const gen = opts.generators[name];
					if (!gen) continue;

					let args: unknown;
					try {
						args = parseArgs(argsRaw);
					} catch {
						s.appendLeft(
							lineEndPos,
							`// invalid ${token} args${eol}`,
						);
						mutated = true;
						continue;
					}

					const block = await gen(args, { id });
					const startComment = `${eol}// @preserve @${token} ${name}:generated:start${eol}`;
					const endComment = `// @preserve @${token} ${name}:generated:end${eol}`;

					if (
						code.slice(
							lineEndPos,
							lineEndPos + startComment.length,
						) === startComment
					) {
						const existingEnd = code.indexOf(
							endComment,
							lineEndPos + startComment.length,
						);
						if (existingEnd !== -1) {
							s.remove(
								lineEndPos,
								existingEnd + endComment.length,
							);
						}
					}

					s.appendLeft(
						lineEndPos,
						`${startComment}${block}${eol}${endComment}`,
					);
					mutated = true;
				}
			}

			if (!mutated) return;
			return {
				code: s.toString(),
				map: s.generateMap({ hires: true, source: id }),
			};
		},
	};
});
