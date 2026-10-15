# LU34 - API Design Best Practices

## Overview

This API has become expensive in quiet way: not broken enough to force a rewrite, but inconsistent enough to slow every client team that touches it.

One route sounds like a handler name. Another returns a different success shape. A failure might give useful signal, or might dump internal detail. A list returns data, but not enough information to continue confidently. None of these issues look dramatic alone. Together, they make the contract hard to trust.

Your job is to clean up that contract.

You are **not** adding new business capability. You are improving:
- route design
- response consistency
- error safety
- list metadata quality

## Starter Structure

```text
src/
  app.js
  routes/
  controllers/
  services/
  utils/
  data/
```

## Setup

```bash
npm install
npm start
```

## Useful Hints

- Let **HTTP method** carry action. Let **URI** name resource.
- If one route returns a raw array and another returns `{ post }`, client already pays unnecessary parsing cost.
- List response should usually return `data` plus some `meta`.
- Error response should help client act, but should not expose stack trace, fake DB text, or internal file detail.
- If client sends a very large `limit`, backend should still protect itself.
- If one route is cleaned up but nearby routes still follow old pattern, contract is still weak.

## Good Audit Questions

1. What is resource here?
2. Can client predict nearby routes without docs?
3. Can client parse all success responses through one habit?
4. Can client parse all error responses through one habit?
5. Does list endpoint tell client how to continue?

## Expected Deliverable

Submit PR link.

## Implemented Contract

- `GET /posts?page=1&limit=10` returns `{ success, data, meta }`; `limit` is capped at 100.
- `GET /posts/:id` returns one post in the standard success envelope.
- `POST /posts` creates a post and returns it with status `201`.
- `POST /posts/:id/likes` records a like using a resource-oriented route.
- Errors use `{ success: false, error: { message } }`; internal failures return a generic message.

## Suggested Manual Checks

After refactor, manually verify:
- list route returns `data` plus pagination `meta`
- single-resource route returns consistent `data`
- create route returns correct status + consistent body
- like route follows resource design
- missing resource returns structured 404
- internal failure returns safe 500 without stack / fake DB leakage
- old verb routes are gone from public contract
