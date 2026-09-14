# Car Trader Manager

A single-user web app for a car trader to track vehicle inventory and sales.

## Features

- Track vehicle inventory: purchase price, additional costs, asking price, and photos
- Record sales and automatically calculate profit (sale price − purchase price − additional costs)
- Generate buyer-facing PDF flyers (asking price only — cost basis never leaks) and sale receipts, shareable via the native share sheet or direct download
- Sortable, aging-inventory-aware inventory and sales views
- Auth and data storage via Supabase (Postgres + Row Level Security, scoped to the signed-in user)

## Tech stack

Plain HTML/CSS/JS — no build tools, no framework, no npm. Each file is an IIFE attaching its API to `window` (e.g. `window.Storage`, `window.Views.inventory`); script order in `index.html` is the dependency graph. PDFs are generated client-side with jsPDF. Backend is [Supabase](https://supabase.com).

## Running it

There's no build step. Serve the directory statically and open it:

```bash
python3 -m http.server 8934
open http://localhost:8934/
```

### Supabase setup

Apply the SQL files in `supabase/` in order via the Supabase SQL Editor:

1. `schema.sql` — `cars` and `sales` tables with RLS policies
2. `add-photos.sql` — photo storage columns and bucket
3. `add-costs-and-asking-price.sql` — additional costs and asking price columns

Then set the Supabase URL and anon key in `auth.js`.

## Design reference

`docs/superpowers/specs/2026-08-11-car-trader-management-design.md` has the original design spec (data model, page-by-page behavior).
