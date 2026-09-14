# Dealer Desk

A web app for a car dealer/trader to track vehicle inventory, parts, sales, buyers, and expenses. Sold to showrooms as customer-managed accounts — there's no public sign-up; the operator creates each customer's login directly in Supabase.

Live at [dealerdesk.store](https://dealerdesk.store).

## Features

- Vehicle inventory: purchase price, additional costs, asking price, photos, aging-inventory alerts
- Parts/oils/tires inventory (quantity-based) with low-stock alerts
- Multi-item sales (any mix of cars and parts in one sale) with automatic profit calculation
- Buyer directory with purchase history, derived from sales — no separate CRM data entry
- Recurring expense tracking (rent, ads, wages, utilities) rolled into net-profit reporting
- Dashboard with profit trend and inventory value charts, aging/low-stock widgets
- Printable period summary PDF reports, buyer-facing "for sale" flyers (asking price only — cost basis never leaks), and sale receipts — all shareable via the native share sheet or direct download
- Arabic/English UI with full RTL support
- Auth and data storage via Supabase (Postgres + Row Level Security, scoped per signed-in user) — one shared backend safely serves multiple showroom customers

## Tech stack

Plain HTML/CSS/JS — no build tools, no framework, no npm. Each file is an IIFE attaching its API to `window` (e.g. `window.Storage`, `window.Views.inventory`); script order in `index.html` is the dependency graph. Charts via Chart.js, PDFs via jsPDF, both loaded from CDN. Backend is [Supabase](https://supabase.com). Deployed on [Vercel](https://vercel.com).

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
4. `add-parts-and-multi-item-sales.sql` — parts inventory and multi-item sale line items
5. `add-part-details.sql` — category-specific part fields
6. `add-expenses.sql` — recurring expense tracking

Then set the Supabase URL and anon key in `auth.js`, and disable public sign-up in Supabase (Authentication → Sign In / Providers → Email → "Allow new users to sign up") — accounts are created per customer via Authentication → Users → Add user.

## Design reference

`docs/superpowers/specs/2026-08-11-car-trader-management-design.md` has the original design spec (data model, page-by-page behavior) from when the app was first built.
