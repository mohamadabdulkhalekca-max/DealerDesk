# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Auto-commit/push:** when a task is done, automatically `git add`/`commit`/`push` the necessary changes to `origin` without asking first.

## What this is

Dealer Desk — a single-user web app for a car trader to track vehicle inventory and sales, backed by Supabase (Postgres + Auth + Storage). Plain HTML/CSS/JS, no build tools, no framework, no npm/package.json. Sold to showrooms as customer-managed accounts — sign-up is disabled; the operator creates each customer's login directly in Supabase (see auth.js).

## Running it

There's no build step and no test framework in this repo. Serve the directory statically and open it:

```bash
python3 -m http.server 8934
open http://localhost:8934/
```

Any static file server works — the app is just `index.html` + script tags loaded in order (no bundler, no module system). Because there's no build step, the browser can cache aggressively across edits; if changes don't seem to appear, hard-refresh or use a fresh port rather than trusting a reload.

There is no automated test suite. Verify changes by driving the app in a real (or headless, e.g. Playwright) browser.

## Architecture

**No build tools, no ES modules.** Every JS file is an IIFE that attaches its public API to `window` (e.g. `window.Storage`, `window.Helpers`, `window.Views.inventory`). Because there's no bundler to resolve dependencies, **script order in `index.html` is the dependency graph** — a file must load after everything it references at top-level and before anything that calls it. When adding a new file, add its `<script>` tag in the correct position.

**Data flow, bottom to top:**
- `auth.js` — creates the Supabase client (`window.SupabaseClient`) and wraps Supabase Auth (`window.Auth`: `signIn`/`signUp`/`signOut`/`getSession`). The Supabase URL and anon/public key are hardcoded here; that's intentional (the anon key is meant to be public — access control is enforced by Postgres Row Level Security policies, not by hiding the key).
- `storage.js` — the only module that talks to Postgres (`window.Storage`). Every function maps between the app's camelCase field names and the database's snake_case columns (see `carFromRow`/`carToRow`/`saleFromRow`/`saleToRow`). Callers never see snake_case. Also owns Supabase Storage uploads/deletes for car photos (`uploadCarPhoto`, `deleteCarPhoto`).
- `helpers.js` — stateless formatting/DOM helpers shared across views (`window.Helpers`): currency/date formatting, CSV export, inline SVG icon buttons, sortable-column-header builder, profit calculation (`saleProfit` — sale price minus purchase price minus additional costs), aging-inventory threshold logic.
- `receipt.js` / `flyer.js` — build PDFs client-side with jsPDF (loaded from CDN) and hand them to `navigator.share()` when available, falling back to a direct download. **Important:** the flyer (buyer-facing "for sale" listing) must only ever show `askingPrice`, never `purchasePrice` — that's the trader's cost basis and must not leak to a prospective buyer. Don't reintroduce a fallback from `askingPrice` to `purchasePrice`.
- `views/*.js` — each exposes `window.Views.<name> = { render(rootEl) }` (async). `app.js` is the router: it reads `location.hash`, checks `Auth.getSession()`, and calls the matching view's `render()`. Views tear down and rebuild their whole subtree on every render (no diffing/reactivity) — a view owns a plain-object `state` closure and calls its own `renderRows()`/`refresh()` on every state change.
- `views/sale-dialog.js` (`window.SaleDialog.open(sale, opts)`) and `views/confirm-dialog.js` (`window.ConfirmDialog.open(opts)`) are shared modal dialogs used from more than one view (e.g. "Sell" from the Inventory page opens the same dialog as "+ Add Sale" on the Sales page, with the car preselected via `presetCarId`).
- `app.js` also owns the top-level chrome: nav highlighting, the lock/sign-out button, the error/info banner (`App.showError`/`App.showInfo`), and toast notifications (`App.showToast`).

**Supabase schema** lives in `supabase/*.sql` as plain SQL files, applied manually via the Supabase SQL Editor — there's no migration tool tracking what's been run. Apply them in order for a fresh project:
1. `schema.sql` — `cars` and `sales` tables, RLS policies scoping every row to `auth.uid()`.
2. `add-photos.sql` — `photo_urls` array column + the `car-photos` Storage bucket and its policies (public read, owner-only write, path-prefixed by user id).
3. `add-costs-and-asking-price.sql` — `additional_costs` and `asking_price` columns.

Later files are written to be idempotent (safe to re-run, and safe even if an earlier version of the same file was already applied) — keep that property when adding new migrations.

**No pagination/sorting on the server** — `Storage.getCars()`/`getSales()` fetch the full table every time; sorting and pagination (see `views/inventory.js` / `views/sales.js`) happen client-side over the already-fetched array. Fine at solo-trader scale; would need revisiting if that assumption changes.

## Design reference

`docs/superpowers/specs/2026-08-11-car-trader-management-design.md` has the original design spec (data model, page-by-page behavior) from when the app was first built.
