# Business vs Personal Separation — Implementation Plan

Goal: cleanly separate business money (company revenue/expenses/profit) from personal money (owner pay/draw, personal bills/debt) without breaking any existing working feature. Most existing pages stay; we add typing, two new top-level tabs, owner-hours, dual allocations, and estimate polish.

---

## 1. Database changes (one migration)

Add columns only — no table renames, no destructive changes.

- `bills`: `bill_type text not null default 'business'` (`'business' | 'personal'`)
- `debts`: `debt_scope text not null default 'personal'` (`'business' | 'personal'`)  
  (using `debt_scope` to avoid clashing with existing `debt_type` category column)
- `worker_time_entries`: already has `worker_id` + `approved` + `paid` — owner hours reuse this table via the owner worker row (no schema change needed). Add `is_owner_entry boolean generated... ` — skip; we already join to `workers.is_owner`.
- `allocation_presets`: add `scope text not null default 'business'` (`'business' | 'personal'`) so presets belong to one side.
- `app_settings` keys (data inserts, not schema): `default_billing_rate=125`, `default_helper_rate=20`, `default_experienced_helper_rate=27`, `business_tax_reserve_pct`, `personal_tax_reserve_pct`. Owner pay keys already exist.
- Backfill: `update bills set bill_type='business' where bill_type is null;` `update debts set debt_scope='personal' where debt_scope is null;`
- Seed two default allocation presets if none exist for each scope.

No RLS changes needed (admin-only tables).

---

## 2. Settings page (`AdminSettings.tsx`)

Reorganize into clearly labeled cards (no destructive removal):

- **Business Rates**: Default Billing Rate ($125), Default helper rate, Experienced helper rate range.
- **Owner Pay** (already exists): clarify label "Owner-worker pay rate" with help text "What you pay yourself when you work — separate from billing rate".
- **Worker Burden**: existing tax/burden/WC/insurance/PPE — unchanged.
- **Tax Reserves**: business tax %, personal tax %.
- **Business Allocations**: edit preset where `scope='business'` (add/edit/delete buckets, must total 100%).
- **Personal Allocations**: edit preset where `scope='personal'`.
- **Recalculate All Totals** button: extend to recompute job worker labor, owner pay, bills paid, debt balances.

---

## 3. New Admin tabs

Add two top-level nav entries in `AdminLayout.tsx`:

- **Business** → `/admin/business` (new `AdminBusiness.tsx`)
- **Personal** → `/admin/personal` (new `AdminPersonal.tsx`)

Existing tabs (Jobs, Pipeline, Calendar, Contacts, Estimates, Templates, Money, Reports, Bills, Debt, Workers, Reviews, Portfolio, Applications, Settings, Setup) stay. The existing **Money** tab remains as a combined power-user view but gets two clearly labeled sections (see §5).

### `AdminBusiness.tsx` cards
Gross revenue (month/week), open balances, completed-unpaid jobs, materials, worker labor, worker burden (if enabled), owner-worker pay, other job expenses, business bills paid/remaining, business debt remaining, **Business job profit**, **Business cash after bills**, business allocation split.

### `AdminPersonal.tsx` cards
Owner pay (week/month), owner draw, personal bills due/paid/remaining, personal debt remaining/paid this month, personal emergency fund, personal allocation split. Formula: `owner pay − personal bills paid − personal debt paid = personal remaining cash`.

---

## 4. Owner-worker hours on jobs

Owner hours already work — owner is just a `worker` row with `is_owner=true` logging through `JobWorkerHours`. Add a dedicated **Owner Hours** card on `AdminJobDetails.tsx` that filters that worker's entries, defaults the rate to `owner_default_hourly` ($50), and shows `owner pay = hours × $50`. Edit/delete supported via existing entry UI.

Job money breakdown card on the job page:
```
Payments collected
− Materials (paid by me)
− Worker labor (non-owner, approved)
− Owner-worker pay (owner, approved)
− Other expenses
= Business job profit
```

---

## 5. Money Tracker restructure (`AdminMoney.tsx`)

Split into two sections on the same page (no new route needed beyond Business/Personal tabs):

**A. Business Money** — gross, materials, worker pay, burden (toggle), owner pay, other exp, business bills paid/remaining, **business job profit**, business allocations on profit.

**B. Personal Money** — owner pay earned, owner draw, personal bills paid/remaining, personal debt paid/remaining, personal allocations on owner pay.

Reuse `useMonthMoney` (already splits `ownerPay` vs `workerLabor`). Add a small `useBillsTotals(from,to,type)` and `useDebtTotals(scope)` hook.

---

## 6. Bills page (`AdminBills.tsx`)

- Add `bill_type` selector on create/edit (Business / Personal).
- Filter chips: All / Business / Personal / Paid / Unpaid / Past due.
- Past-due unpaid still counted in "remaining" until `paid=true`. Paid-this-month uses `paid_on` in current month (already correct from prior pass — verify).

---

## 7. Debt page (`AdminDebt.tsx`)

- Add `debt_scope` selector on create/edit.
- Two sections: Business Debt, Personal Debt with separate totals.
- Debt payments editable/deletable (existing).

---

## 8. Reports (`AdminReports.tsx`)

Two report blocks:

- **Business Report**: gross, materials, worker labor, owner pay, other exp, net profit, business bills, business debt, business allocation breakdown.
- **Personal Report**: owner pay earned, owner draw, personal bills, personal debt, personal allocations, personal remaining cash.

Footer note: "Business profit and owner personal pay are separate. Owner pay is personal income. Business profit remains in the company."

---

## 9. Dashboard (`AdminDashboard.tsx`)

Group existing cards into two visually distinct rows: **Business** (gross, open balances, materials, worker labor, owner pay, business net profit, business bills remaining, business tax reserve) and **Personal** (owner pay week/month, personal bills remaining, personal debt remaining, personal debt paid this month, personal allocation split).

---

## 10. Estimate Builder (`AdminEstimates.tsx` + `EstimateShare.tsx`)

Already has discount-aware line items from prior pass. Polish:

- Verify line item shape: `{ title, description, qty, unit_price, discount, final_unit_price, materials_included, customer_supplied_note }`.
- Ensure `EstimateShare.tsx` renders with **clean** "SCOPE OF WORK — ELECTRICAL" layout, real bullets, no literal `\n`.
- Show: Original Total / Customer Discount / Final Agreed Total / Deposit Required / Balance Due / Materials note / Terms / Business contact footer (`614-671-8528`).

---

## 11. Worker portal

Already exists (`/worker/login`, `/worker/dashboard`). Verify it shows only assigned jobs/tasks/hours/photos and never exposes money/bills/debt/reports/settings. Add an "Invite worker" button on `AdminWorkers.tsx` calling `supabase.functions.invoke('worker-invite', { body: { worker_id }})` if not already wired.

---

## 12. Out of scope (explicit)

No van inventory. No messaging system. No table renames. No rebuild of working features.

---

## Technical details

**Files to edit**
- `src/pages/admin/AdminLayout.tsx` (add 2 nav entries)
- `src/App.tsx` (2 new routes)
- `src/pages/admin/AdminSettings.tsx` (settings cards + dual allocation editors)
- `src/pages/admin/AdminBills.tsx` (bill_type field + filters)
- `src/pages/admin/AdminDebt.tsx` (debt_scope field + sections)
- `src/pages/admin/AdminMoney.tsx` (split sections)
- `src/pages/admin/AdminReports.tsx` (split report)
- `src/pages/admin/AdminDashboard.tsx` (group cards)
- `src/pages/admin/AdminJobDetails.tsx` (owner hours card + breakdown)
- `src/pages/EstimateShare.tsx` (clean format pass)
- `src/lib/useAllocations.ts` (filter by scope)
- `src/lib/useGlobalSettings.ts` (new keys)

**Files to create**
- `src/pages/admin/AdminBusiness.tsx`
- `src/pages/admin/AdminPersonal.tsx`
- `src/lib/useBillsTotals.ts`, `src/lib/useDebtTotals.ts`
- One migration file (columns + backfill + seed presets)

**Calculation rules**
```
business_job_profit = collected − materials_me − worker_labor − (burden if enabled) − owner_pay − other_exp
business_cash_after_bills = business_job_profit − business_bills_paid
personal_remaining = owner_pay_earned + owner_draw − personal_bills_paid − personal_debt_paid
business_allocations apply to business_job_profit only
personal_allocations apply to owner_pay + owner_draw only
```

**QA tests run after build**: the 5 examples in the request (job math, no-workers=$0, personal debt doesn't touch business profit, paid_on filtering, estimate format).
