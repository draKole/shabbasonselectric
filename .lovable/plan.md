# Payroll, Worker Portal, Paystubs, YTD Import — DONE

Implemented additively. No table renames. No rebuilds.

## New tables
- `paystubs` (admin manage, worker SELECT own)
- `historical_income` (admin only)
- `worker_documents` (admin manage, worker SELECT own; 8 default keys)
- `worker_time_entries` extended: start_time, end_time, status, paystub_id, approved_by, approved_at, rejected_reason

## New code
- `src/lib/paystubs.ts` — `computePaystub()` + `PAYSTUB_DISCLAIMER`
- `src/lib/useHistoricalIncome.ts`
- `src/lib/useWorkerDocuments.ts` — incl. `seedWorkerDocs(workerId)`
- `src/pages/admin/AdminPaystubs.tsx` — generate + view + print/PDF + mark paid + void
- `src/pages/admin/AdminHistoricalIncome.tsx` — full CRUD; YTD vs cash split
- Routes added to `App.tsx`, nav links to `AdminLayout.tsx`

## Edits
- `useGlobalSettings.ts` — 12 new payroll/tax/paystub keys with defaults
- `AdminSettings.tsx` — Payroll & Tax Planning section (federal/Ohio/local WH, FICA EE/ER, retirement toggle+pct+note, pay period default, billing/owner/helper/exp helper rates, paystub company info, business+personal tax reserve %)
- `AdminApplications.tsx` — `seedWorkerDocs()` runs when a worker is created from an application
- `WorkerDashboard.tsx` — adds My Paystubs section (with print modal) and editable My Profile

## Seed data
- Historical business income Jan–May 2026 (5825/7050/13440/6575/7050) — already_spent=true, count_in_ytd=true, count_in_cash=false, source 'manual_import'
- Default app_settings rows for new payroll/tax/paystub keys

## Out of scope (kept stable)
- No changes to `useMonthMoney` formulas
- No payroll provider integration
- Worker documents UI panel inside admin worker detail not added (table + seeding ready, can wire next pass)
