#!/bin/sh
# Install the packed package in a new project, then test its ESM exports.
# Run after `bun run build`.
set -eu

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

npm pack --silent --pack-destination "$work" >/dev/null 2>&1
if tar -tzf "$work"/ts-order-*.tgz | grep -E '\.(cjs|d\.cts)$'; then
	echo 'Unexpected CommonJS build artifact' >&2
	exit 1
fi
cd "$work"
npm init -y >/dev/null
npm install --no-audit --no-fund ./ts-order-*.tgz >/dev/null

node --input-type=module -e "
import { compile, Order } from 'ts-order';
import { number } from 'ts-order/comparator';
const sorted = Order.by((x) => x.v, { compare: number }).sort([{ v: 2 }, { v: 1 }]);
if (sorted[0].v !== 1) throw new Error('ESM sort failed');
const compiled = compile(Order.by((x) => x.v)).sort([{ v: 2 }, { v: 1 }]);
if (compiled[0].v !== 1) throw new Error('ESM compile failed');
await import('ts-order/compile');
const auto = Order.by((x) => x.v).sort([{ v: 2 }, { v: 1 }]);
if (auto[0].v !== 1) throw new Error('ESM ts-order/compile failed');
console.log('ESM ok');
"

node -e "import('ts-order').then(({ Order }) => {
  if (Order.by((x) => x.v).sort([{ v: 2 }, { v: 1 }])[0].v !== 1)
    throw new Error('CommonJS dynamic import failed');
  console.log('CommonJS dynamic import ok');
})"
