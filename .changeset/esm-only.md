---
'ts-order': minor
---

Publish ESM only. The CommonJS build and the `require` export conditions are removed. ESM code and bundled apps need no change. CommonJS code can still `require('ts-order')` on Node.js 20.19 or later, 22.12 or later, or 23 and later. On Node.js 20.0 to 20.18, `require` fails with `ERR_REQUIRE_ESM`, so use `await import('ts-order')` or upgrade Node.js.
