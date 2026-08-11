# Car Trader Management System — Design

## Purpose

A web system for a solo car trader to manage their business: track vehicle
inventory and record sales/deals against that inventory. Built with plain
HTML, CSS, and JavaScript — no frameworks, no build tools.

## Scope (v1)

- Single user, protected by a simple password lock (no multi-user accounts).
- Data persisted in the browser (`localStorage`).
- No photo support in v1 (deferred until a real backend exists).
- Data layer is abstracted so `localStorage` can later be swapped for a real
  backend API without changing the rest of the app.

## Architecture

Single-page app with client-side view switching (no routing library). Views
are shown/hidden in one `index.html`; navigation is handled by a small JS
router that toggles visibility and re-renders the active view.

All data access goes through a storage module (`storage.js`) exposing:

- `getCars()`, `getCar(id)`, `saveCar(car)`, `deleteCar(id)`
- `getSales()`, `getSale(id)`, `saveSale(sale)`, `deleteSale(id)`
- `getSettings()`, `saveSettings(settings)` (holds the password hash)

Internally these read/write `localStorage` today. No other module touches
`localStorage` directly. This means the storage module is the only file that
needs to change if/when a real backend is introduced later (swap internals
for `fetch()` calls; function signatures stay the same).

### File structure

```
index.html
styles.css
app.js          (view router, event wiring)
storage.js       (data layer — localStorage now, swappable later)
views/
  login.js
  dashboard.js
  inventory.js
  sales.js
```

## Pages

1. **Login** — password field. On first run, prompts to set a password
   (stored as a hash in `localStorage` via `saveSettings`). Subsequent visits
   require entering the matching password. Session unlocks for the tab
   (in-memory flag) until the tab closes or "Lock" is clicked — no timeout.
2. **Dashboard** (default view after login) — shows:
   - Cars currently in stock (count)
   - Total inventory value (sum of purchase price for in-stock cars)
   - This month's sales count and total profit
   - Recent sales list (last 5, most recent first)
3. **Inventory** — table of all cars: make, model, year, status, purchase
   price, mileage. Search/filter by status (in stock / reserved / sold).
   "Add Car" opens a form; clicking a row opens the same form pre-filled for
   editing. Delete available per row.
4. **Sales** — table of all sales: car (make/model/year), buyer name, sale
   price, sale date, payment status. "Add Sale" opens a form where you pick
   a car from those currently `in_stock` (or `reserved`), fill in buyer and
   price details, and save. Saving a sale sets the linked car's `status` to
   `sold`. Delete available per row.

## Data Model

```
Car {
  id: string (generated)
  make: string
  model: string
  year: number
  vin: string
  color: string
  mileage: number
  purchasePrice: number
  purchaseDate: string (ISO date)
  status: "in_stock" | "reserved" | "sold"
  notes: string
}

Sale {
  id: string (generated)
  carId: string (references Car.id)
  buyerName: string
  buyerContact: string
  salePrice: number
  saleDate: string (ISO date)
  paymentStatus: "paid" | "pending"
  notes: string
}

Settings {
  passwordHash: string
}
```

Profit per sale is computed on the fly as `salePrice - car.purchasePrice`
(not stored), so edits to a car's purchase price after the sale stay
reflected correctly.

## Behavior & Validation

- **Car required fields:** make, model, year, purchase price (numeric,
  positive). VIN, color, mileage, notes optional.
- **Sale required fields:** car selected, buyer name, sale price (numeric,
  positive). Buyer contact, notes optional.
- **Selling a car:** recorded via the Sales "Add Sale" form only (not
  editable directly from the Inventory form) — this is what flips the car's
  status to `sold` and keeps inventory and sales in sync.
- **Deleting a car with a linked sale:** blocked with a warning message
  ("This car has a recorded sale — delete the sale first").
- **Empty states:** Inventory and Sales tables show a friendly empty-state
  message ("No cars yet — add your first one" / "No sales recorded yet")
  instead of a blank table when there's no data.
- **localStorage unavailable:** if reads/writes fail (e.g. storage disabled),
  show a dismissible error banner at the top of the app rather than failing
  silently or crashing.

## Testing

No automated test framework — this is a static app with no build step.
Verification is manual, in-browser, covering the golden paths:

- First-run password setup, then lock/unlock with the correct password.
- Add, edit, and delete a car; confirm it appears/updates/disappears in the
  Inventory table and dashboard stats update accordingly.
- Record a sale against an in-stock car; confirm the car's status flips to
  `sold`, the sale appears in the Sales table, and dashboard stats
  (sales count, profit) update.
- Attempt to delete a car with a linked sale; confirm it's blocked.
- Confirm empty states render correctly on a fresh/empty dataset.
