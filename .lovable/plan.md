# Cleanup & Simplify Business/Personal Money System

Scope: UI cleanup + one new feature (Personal Expense logger). No table renames. No rebuilds.

## 1. Terminology change (UI only)
Across `AdminMoney`, `AdminReports`, `AdminBusiness`, `AdminDashboard`:
- "Worker Burden" → **"Extra Worker Cost"** with helper text: *"Includes tax reserve, workers comp, insurance, PPE, tools, and other costs of having workers."*
- Replace "True Worker Cost" labels with **"Total Worker Cost"** = Worker Pay + Extra Worker Cost.
- Standardize labels:
  - **"Owner-Worker Pay"** on business side
  - **"Owner Pay / Personal Income"** on personal side
  - **"Owner Draw"** for transfers business→personal

## 2. Dashboard fix (`AdminDashboard.tsx`)
Currently shows labor as $0 when only owner-worker pay exists. Restructure into two sections:

**A. Business Snapshot** — Gross collected, Materials, Non-owner pay, Owner-worker pay, **Total labor cost** (sum), Other job expenses, Business profit, Business bills remaining, Business cash after bills.

**B. Personal Snapshot** — Owner pay earned, Owner draw taken, Total personal money, Personal bills remaining, Personal debt remaining, Personal allocations link.

Remove duplicate owner pay cards.

## 3. Business page cleanup (`AdminBusiness.tsx`)
Group cards into 5 ordered sections matching money flow:
1. Money In — Gross collected
2. Job Costs — Materials, Non-owner pay, Owner-worker pay, Extra worker cost, Other job expenses
3. Business Profit (highlight)
4. Business Obligations — Bills paid, Bills remaining, Debt payments, Tax reserve, Payroll reserve
5. Business Cash — Profit − bills − draws

Update default business allocation buckets seed (via insert tool, only if missing): Tax reserve, Payroll reserve, Insurance/Workers Comp, Tools/Equipment, Marketing, Business Emergency Fund, Permits/Software/Admin, Business Savings/Growth.

## 4. Personal Expense logger (NEW)
**New table** `personal_expenses` (migration):
- id, expense_date, amount, category (text), method (text), notes, recurring (bool), related_bill_id (uuid nullable), created_at, updated_at
- RLS: admins manage

Add new hook `usePersonalExpenses(from,to)` returning paid total + list.

Update `AdminPersonal.tsx`:
- Add expense logger card (form: date, amount, category dropdown, method, recurring, notes) + recent list.
- Add Owner Draw tracking (use existing `worker_payments` filtered to owner_worker_id = type 'draw'? Simpler: add `owner_draws` separately) — for now treat as a manual tracked draw using new field on `personal_expenses` with category 'owner_draw_in'? **Simpler & non-breaking**: store draws as a row in `personal_expenses` with category `owner_draw` but income flag. Cleaner: add a tiny `personal_income` table too.

Decision (keep small): add **one** table `personal_ledger` with `kind` ('expense'|'draw'|'income') so we don't proliferate. But user said "Personal Expense Logger" — keep simple table named `personal_expenses` and add an optional `is_income` bool for owner draws / manual income.

Personal cash formula:
`owner_pay + owner_draw + manual_income − personal_bills_paid − personal_debt_paid − personal_expenses`

## 5. Tax reserve display
Already have `business_tax_reserve_pct` and `personal_tax_reserve_pct`. Add clear cards:
- Personal page: "Personal tax reserve" = ownerPay × pct
- Business page: "Business tax reserve" = profit × pct
- Reports: show under each section. No double-deduction (these are display-only reserves, not subtracted from cash again).

## 6. Money Tracker cleanup (`AdminMoney.tsx`)
Restructure into 3 collapsible sections using `Collapsible`:
- **A. Business Money** cards + expandable Labor Detail
- **B. Personal Money** cards
- **C. Allocations** — two panels (Business / Personal)

Remove duplicate owner-pay cards.

## 7. Reports cleanup (`AdminReports.tsx`)
Same labels. Three collapsible sections:
- Business Report
- Personal Report  
- Labor Report (with Extra worker cost breakdown collapsible)

## 8. Workers page cleanup (`AdminWorkers.tsx`)
- Add search input
- Add filter chips: Active / Inactive / Pending / Owner / Helper / Electrician / Contractor
- Add sort dropdown: Name / Hours this week / Balance owed / Role
- Compact card: Name, Role, Status, Rate, Hours this week, Balance owed, buttons (Log Hours, Pay, View)
- Detail tabs only if simple — otherwise just a section toggle. Keep existing detail in place; reduce list noise.

## Files touched
- New migration: create `personal_expenses` table + seed business allocation preset (if not exists)
- New: `src/lib/usePersonalExpenses.ts`
- Edit: `AdminDashboard.tsx`, `AdminBusiness.tsx`, `AdminPersonal.tsx`, `AdminMoney.tsx`, `AdminReports.tsx`, `AdminWorkers.tsx`

## Out of scope
- No new owner-draw tracking table (handled via `personal_expenses.is_income`)
- No backend formula changes to `useMonthMoney` (already correct after prior passes); only labels & layout change.
- No estimate/jobs/contacts/bills/debt schema changes.
