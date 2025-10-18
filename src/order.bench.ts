import { Order } from 'ts-order';
import { bench, describe } from 'vitest';
import { by, order } from './comparator/index.js';

// ----- Domain -----
type Role = 'admin' | 'manager' | 'staff' | 'guest';
type User = {
	id: number;
	firstName: string;
	lastName: string;
	age: number | null;
	isActive: boolean;
	role: Role;
	createdAt: Date;
	address: {
		city: string;
		street: string;
		postcode: string;
	};
};

// ----- Utilities -----
function xorshift32(seed: number) {
	let x = seed >>> 0;
	return () => {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		// eslint-disable-next-line unicorn/number-literal-case
		return (x >>> 0) / 0xffffffff;
	};
}

const ROLE_RANK: Record<Role, number> = {
	admin: 0,
	manager: 1,
	staff: 2,
	guest: 3,
};

function caseInsensitiveCompare(a: string, b: string): number {
	const A = a.toLocaleLowerCase();
	const B = b.toLocaleLowerCase();
	if (A < B) return -1;
	if (A > B) return 1;
	return 0;
}

// Sort nulls last for numbers
function compareNumberNullsLast(a: number | null, b: number | null): number {
	const aNull = a == null;
	const bNull = b == null;
	if (aNull && bNull) return 0;
	if (aNull) return 1;
	if (bNull) return -1;
	if (a! < b!) return -1;
	if (a! > b!) return 1;
	return 0;
}

function nativeUserComparator(a: User, b: User): number {
	const aLast = a.lastName.toLocaleLowerCase();
	const bLast = b.lastName.toLocaleLowerCase();
	if (aLast < bLast) return -1;
	if (aLast > bLast) return 1;

	const aFirst = a.firstName.toLocaleLowerCase();
	const bFirst = b.firstName.toLocaleLowerCase();
	if (aFirst < bFirst) return -1;
	if (aFirst > bFirst) return 1;

	if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;

	const roleDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
	if (roleDiff !== 0) return roleDiff;

	const dateDiff = a.createdAt.getTime() - b.createdAt.getTime();
	if (dateDiff !== 0) return dateDiff;

	const ageA = a.age;
	const ageB = b.age;
	const aNull = ageA == null;
	const bNull = ageB == null;
	if (aNull && bNull) return 0;
	if (aNull) return 1;
	if (bNull) return -1;
	if (ageA! < ageB!) return -1;
	if (ageA! > ageB!) return 1;
	return 0;
}

function nativeLastNameCaseInsensitive(a: User, b: User): number {
	const aLast = a.lastName.toLocaleLowerCase();
	const bLast = b.lastName.toLocaleLowerCase();
	if (aLast < bLast) return -1;
	if (aLast > bLast) return 1;
	return 0;
}

function nativeLastNameDefault(a: User, b: User): number {
	const aLast = a.lastName;
	const bLast = b.lastName;
	if (aLast < bLast) return -1;
	if (aLast > bLast) return 1;
	return 0;
}

// Deterministic dataset
function makeUsers(n: number, seed = 123): User[] {
	const rnd = xorshift32(seed);
	const firsts = [
		'Ada',
		'Alan',
		'Grace',
		'Bjarne',
		'Edsger',
		'Barbara',
		'Donald',
		'Ken',
		'Linus',
		'Leslie',
	];
	const lasts = [
		'Lovelace',
		'Turing',
		'Hopper',
		'Stroustrup',
		'Dijkstra',
		'Liskov',
		'Knuth',
		'Thompson',
		'Torvalds',
		'Lamport',
	];
	const cities = [
		'Perth',
		'Sydney',
		'Auckland',
		'Wellington',
		'Melbourne',
		'Brisbane',
		'Adelaide',
		'Christchurch',
	];
	const streets = [
		'Main St',
		'High St',
		'King St',
		'Queen St',
		'George St',
		'Victoria Ave',
		'Oxford Rd',
		'Station Rd',
	];
	const roles: Role[] = ['guest', 'staff', 'manager', 'admin'];

	const arr: User[] = Array.from({ length: n });
	for (let i = 0; i < n; i++) {
		const firstName = firsts[(rnd() * firsts.length) | 0]!;
		const lastName = lasts[(rnd() * lasts.length) | 0]!;
		const role = roles[(rnd() * roles.length) | 0]!;
		const agePick = rnd();
		const age = agePick < 0.15 ? null : 18 + ((rnd() * 60) | 0); // ~15% nulls
		const isActive = rnd() < 0.55;
		const createdAt = new Date(
			2018 + ((rnd() * 7) | 0),
			(rnd() * 12) | 0,
			1 + ((rnd() * 28) | 0),
		);
		arr[i] = {
			id: i + 1,
			firstName,
			lastName,
			age,
			isActive,
			role,
			createdAt,
			address: {
				city: cities[(rnd() * cities.length) | 0]!,
				street: streets[(rnd() * streets.length) | 0]!,
				postcode: String(6000 + ((rnd() * 700) | 0)),
			},
		};
	}
	return arr;
}

// ----- Orders under test -----
// Primary: lastName (ci asc) → firstName (ci asc) → isActive (desc) → role priority asc → createdAt asc → age (nulls last) asc
const USER_ORDER = Order.by<User, number>((u) => ROLE_RANK[u.role])
	.by((u) => u.lastName)
	.by((u) => u.firstName)
	.by((u) => u.isActive, { direction: 'desc' })
	.by((u) => u.createdAt.getTime())
	.by((u) => u.age, { compare: compareNumberNullsLast });

// Nested-property mapping: first by city, then by street, then by postcode
const ADDRESS_ORDER = Order.map<User, User['address']>(
	(u) => u.address,
	Order.by<User['address'], string>((a) => a.city, {
		compare: caseInsensitiveCompare,
	})
		.by((a) => a.street, { compare: caseInsensitiveCompare })
		.by((a) => a.postcode, { compare: caseInsensitiveCompare }),
);

// Combine both—with address taking precedence, then the main name/role/date pipeline.
const COMBINED = ADDRESS_ORDER.by((u) => u.lastName, {
	compare: caseInsensitiveCompare,
})
	.by((u) => u.firstName, { compare: caseInsensitiveCompare })
	.by((u) => u.role, { compare: (a, b) => ROLE_RANK[a] - ROLE_RANK[b] });

const SIMPLE_NAME_ORDER = Order.by<User, string>((u) => u.lastName, {
	compare: caseInsensitiveCompare,
});
const SIMPLE_NAME_ORDER_DEFAULT = Order.by<User, string>((u) => u.lastName);
const SAMPLE_SIZES = [10, 25, 50, 100, 1_000, 50_000, 100_000] as const;

// ----- Benches -----
describe.each(SAMPLE_SIZES)(
	'order.sort(User) — multi-step (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 1300 + sampleSize);
		const comparator = USER_ORDER.compare;

		bench(`${sampleSize} users • Order.sort (6 steps)`, () => {
			Order.sort(users, USER_ORDER);
		});

		bench(`${sampleSize} users • sort(compare) (6 steps)`, () => {
			users.slice().sort(comparator);
		});

		const orderFnCompare = order<User>(
			by((u) => u.lastName, {
				compare: caseInsensitiveCompare,
			}),
			by((u) => u.firstName, {
				compare: caseInsensitiveCompare,
			}),
			by((u) => u.isActive, { direction: 'desc' }),
			by((u) => ROLE_RANK[u.role]),
			by((u) => u.createdAt.getTime()),
			by((u) => u.age, { compare: compareNumberNullsLast }),
		);

		bench(`${sampleSize} users • arr.sort(order(by())) (6 steps)`, () => {
			users.slice().sort(orderFnCompare);
		});

		bench(`${sampleSize} users • native comparator (6 steps)`, () => {
			const copy = users.slice();
			copy.sort(nativeUserComparator);
		});
	},
);

describe.each(SAMPLE_SIZES)(
	'order.sort(User) — nested address map (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 1700 + sampleSize);
		const comparator = COMBINED.compare;

		bench(`${sampleSize} users • Order.sort (address map)`, () => {
			Order.sort(users, COMBINED);
		});

		bench(`${sampleSize} users • sort(compare) (address map)`, () => {
			users.slice().sort(comparator);
		});

		const nativeAddressComparator = (a: User, b: User): number => {
			// Address comparison
			const aCity = a.address.city.toLocaleLowerCase();
			const bCity = b.address.city.toLocaleLowerCase();
			if (aCity < bCity) return -1;
			if (aCity > bCity) return 1;

			const aStreet = a.address.street.toLocaleLowerCase();
			const bStreet = b.address.street.toLocaleLowerCase();
			if (aStreet < bStreet) return -1;
			if (aStreet > bStreet) return 1;

			const aPost = a.address.postcode.toLocaleLowerCase();
			const bPost = b.address.postcode.toLocaleLowerCase();
			if (aPost < bPost) return -1;
			if (aPost > bPost) return 1;

			// Then name comparison
			const aLast = a.lastName.toLocaleLowerCase();
			const bLast = b.lastName.toLocaleLowerCase();
			if (aLast < bLast) return -1;
			if (aLast > bLast) return 1;

			const aFirst = a.firstName.toLocaleLowerCase();
			const bFirst = b.firstName.toLocaleLowerCase();
			if (aFirst < bFirst) return -1;
			if (aFirst > bFirst) return 1;

			return 0;
		};

		bench(`${sampleSize} users • native comparator (address map)`, () => {
			users.slice().sort(nativeAddressComparator);
		});
	},
);

describe.each(SAMPLE_SIZES)(
	'order.sort(User) — basic name asc (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 2100 + sampleSize);
		const comparator = SIMPLE_NAME_ORDER.compare;

		bench(`${sampleSize} users • Order.sort (lastName asc ci)`, () => {
			Order.sort(users, SIMPLE_NAME_ORDER);
		});

		bench(`${sampleSize} users • sort(compare) (lastName asc ci)`, () => {
			users.slice().sort(comparator);
		});

		const compareFn = by<User, string>((u) => u.lastName, {
			compare: caseInsensitiveCompare,
		});
		bench(
			`${sampleSize} users • arr.sort(order(by())) (lastName asc ci)`,
			() => {
				users.slice().sort(compareFn);
			},
		);

		bench(
			`${sampleSize} users • native comparator (lastName asc ci)`,
			() => {
				users.slice().sort(nativeLastNameCaseInsensitive);
			},
		);
	},
);

describe.each(SAMPLE_SIZES)(
	'order.sort(User) — basic name asc (default compare) (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 1337);
		const comparator = SIMPLE_NAME_ORDER_DEFAULT.compare;

		bench(`${sampleSize} users • Order.sort (lastName asc default)`, () => {
			Order.sort(users, SIMPLE_NAME_ORDER_DEFAULT);
		});

		bench(
			`${sampleSize} users • sort(compare) (lastName asc default)`,
			() => {
				users.slice().sort(comparator);
			},
		);

		const compareFn = by<User, string>((u) => u.lastName);

		bench(
			`${sampleSize} users • arr.sort(order(by())) (lastName asc default)`,
			() => {
				users.slice().sort(compareFn);
			},
		);

		bench(
			`${sampleSize} users • native comparator (lastName asc default)`,
			() => {
				const copy = users.slice();
				copy.sort(nativeLastNameDefault);
			},
		);
	},
);

// describe("Cold vs warm Order creation", () => {
describe.each(SAMPLE_SIZES)(
	'order creation + sort(User) — cold vs warm (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 1337);

		bench('cold Order creation and sort', () => {
			const order = Order.by<User, number>((u) => ROLE_RANK[u.role])
				.by((u) => u.lastName)
				.by((u) => u.firstName)
				.by((u) => u.isActive, { direction: 'desc' })
				.by((u) => u.createdAt.getTime())
				.by((u) => u.age, { compare: compareNumberNullsLast });
			Order.sort(users, order);
		});

		bench('cold Order creation and sort(compare)', () => {
			const order = Order.by<User, number>((u) => ROLE_RANK[u.role])
				.by((u) => u.lastName)
				.by((u) => u.firstName)
				.by((u) => u.isActive, { direction: 'desc' })
				.by((u) => u.createdAt.getTime())
				.by((u) => u.age, { compare: compareNumberNullsLast });
			const comparator = order.compare;
			users.slice().sort(comparator);
		});

		const warmOrder = Order.by<User, number>((u) => ROLE_RANK[u.role])
			.by((u) => u.lastName)
			.by((u) => u.firstName)
			.by((u) => u.isActive, { direction: 'desc' })
			.by((u) => u.createdAt.getTime())
			.by((u) => u.age, { compare: compareNumberNullsLast });
		const warmComparator = warmOrder.compare;

		bench('warm Order creation and sort', () => {
			Order.sort(users, warmOrder);
		});

		bench('warm Order creation and sort(compare)', () => {
			users.slice().sort(warmComparator);
		});
	},
);

// Bucketing by role rank → per-role rules → final tie-break on id
describe.each(SAMPLE_SIZES)(
	'role-bucketed per-role rules (%i users)',
	(sampleSize) => {
		const users = makeUsers(sampleSize, 7400 + sampleSize);

		// Order.case: bucket by role rank; within each role apply its own rules; final tie-break by id.
		// Rules:
		// - admin:    lastName(ci), firstName(ci)
		// - manager:  createdAt(asc), lastName(ci)
		// - staff:    isActive(desc), createdAt(asc)
		// - guest:    age(nulls last asc)
		// - final:    id(asc)
		const ROLE_BUCKETED_ORDER = Order.by<User, number>(
			(u) => ROLE_RANK[u.role],
		) // primary bucket
			// admin-only steps
			.by((u) => (u.role === 'admin' ? u.lastName : ''), {
				compare: caseInsensitiveCompare,
			})
			.by((u) => (u.role === 'admin' ? u.firstName : ''), {
				compare: caseInsensitiveCompare,
			})
			// manager-only steps
			.by((u) => (u.role === 'manager' ? u.createdAt.getTime() : 0))
			.by((u) => (u.role === 'manager' ? u.lastName : ''), {
				compare: caseInsensitiveCompare,
			})
			// staff-only steps
			.by((u) => (u.role === 'staff' ? u.isActive : false), {
				direction: 'desc',
			})
			.by((u) => (u.role === 'staff' ? u.createdAt.getTime() : 0))
			// guest-only steps
			.by((u) => (u.role === 'guest' ? u.age : null), {
				compare: compareNumberNullsLast,
			})
			// universal tie-break
			.by((u) => u.id);
		const comparator = ROLE_BUCKETED_ORDER.compare;

		function nativeRoleBucketedComparator(a: User, b: User): number {
			const rA = ROLE_RANK[a.role];
			const rB = ROLE_RANK[b.role];
			if (rA !== rB) return rA - rB;

			// Per-role rules without id; fall through to final id tie-break
			if (a.role === 'admin') {
				const r1 = caseInsensitiveCompare(a.lastName, b.lastName);
				if (r1) return r1;
				const r2 = caseInsensitiveCompare(a.firstName, b.firstName);
				if (r2) return r2;
			} else if (a.role === 'manager') {
				const r1 = a.createdAt.getTime() - b.createdAt.getTime();
				if (r1) return r1;
				const r2 = caseInsensitiveCompare(a.lastName, b.lastName);
				if (r2) return r2;
			} else if (a.role === 'staff') {
				if (a.isActive !== b.isActive) return a.isActive ? -1 : 1; // desc
				const r2 = a.createdAt.getTime() - b.createdAt.getTime();
				if (r2) return r2;
			} else {
				// guest
				const r1 = compareNumberNullsLast(a.age, b.age);
				if (r1) return r1;
			}

			// Single, deduped final tie-break
			return a.id - b.id;
		}

		bench(
			`${sampleSize} users • Order.sort (role buckets + per-role + id)`,
			() => {
				Order.sort(users, ROLE_BUCKETED_ORDER);
			},
		);

		bench(
			`${sampleSize} users • sort(compare) (role buckets + per-role + id)`,
			() => {
				users.slice().sort(comparator);
			},
		);

		const orderFnCompare = order<User>(
			by((u) => ROLE_RANK[u.role]),
			// admin-only steps
			by((u) => (u.role === 'admin' ? u.lastName : ''), {
				compare: caseInsensitiveCompare,
			}),
			by((u) => (u.role === 'admin' ? u.firstName : ''), {
				compare: caseInsensitiveCompare,
			}),
			// manager-only steps
			by((u) => (u.role === 'manager' ? u.createdAt.getTime() : 0)),
			by((u) => (u.role === 'manager' ? u.lastName : ''), {
				compare: caseInsensitiveCompare,
			}),
			// staff-only steps
			by((u) => (u.role === 'staff' ? u.isActive : false), {
				direction: 'desc',
			}),
			by((u) => (u.role === 'staff' ? u.createdAt.getTime() : 0)),
			// guest-only steps
			by((u) => (u.role === 'guest' ? u.age : null), {
				compare: compareNumberNullsLast,
			}),
			// universal tie-break
			by((u) => u.id),
		);

		bench(
			`${sampleSize} users • arr.sort(order(by())) (role buckets + per-role + id)`,
			() => {
				users.slice().sort(orderFnCompare);
			},
		);

		bench(
			`${sampleSize} users • native comparator (role buckets + per-role + id)`,
			() => {
				const copy = users.slice();
				copy.sort(nativeRoleBucketedComparator);
			},
		);
	},
);
