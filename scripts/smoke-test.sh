#!/bin/sh
# Install the packed package in a new project, then import it from ESM and
# require it from CommonJS. Run after `bun run build`.
set -eu

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

npm pack --silent --pack-destination "$work" >/dev/null 2>&1
cd "$work"
npm init -y >/dev/null
npm install --no-audit --no-fund ./ts-order-*.tgz >/dev/null

node --input-type=module -e "
import { Order } from 'ts-order';
import { number } from 'ts-order/comparator';
const sorted = Order.by((x) => x.v, { compare: number }).sort([{ v: 2 }, { v: 1 }]);
if (sorted[0].v !== 1) throw new Error('ESM sort failed');
console.log('ESM ok');
"

node -e "
const { Order } = require('ts-order');
const { number } = require('ts-order/comparator');
const sorted = Order.by((x) => x.v, { compare: number }).sort([{ v: 2 }, { v: 1 }]);
if (sorted[0].v !== 1) throw new Error('CommonJS sort failed');
console.log('CommonJS ok');
"
