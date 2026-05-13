# Payroll, Worker Portal, Paystubs, YTD Import & Money Cleanup

This is a large scope. I'll do it in **one migration + phased UI implementation**, reusing existing tables where possible. No renames, no rebuilds.

## 1. Database migration (one shot)

**New tables:**
- `paystubs` — worker_id, period_start, period_end, pay_date, hours, hourly_rate, gross, fed_wh, state_wh, local_wh, fica_ee, fica_er, retirement, wc_amt, ins_amt, ppe_amt, deductions_total, net_pay, employer_total_cost, status (draft|paid|void), pdf_url, notes
- `historical_income` — entry_date (or month), customer_name, description, amount, scope (business|personal), source default 'manual_import', already_spent bool, count_in_ytd bool, count_in_cash bool, notes
- `worker_documents` — worker_id, doc_key (w4|i9|insurance|wc|ppe|tools|rate|emergency_contact), received bool, received_on, notes

**Extend existing tables (additive only):**
- `worker_time_entries`: add `start_time timestamptz`, `end_time timestamptz`, `status text default 'approved'` (submitted|approved|rejected|paid), `paystub_id uuid`, `approved_by uuid`, `approved_at timestamptz`, `rejected_reason text`. Keep existing `approved`/`paid` bools for back-compat.
- `personal_expenses`: already has `is_income`. Add `source text` (optional) for "owner_draw" tagging consistency. (Actually already used via category — skip.)

**RLS:**
- paystubs: admins manage; workers SELECT own (`worker_id = my_worker_id()`)
- historical_income: admins only
- worker_documents: admins manage; workers SELECT own

**Settings keys (seed via insert tool, not migration):** new keys for tax planning percentages, FICA, retirement, paystub company info, pay period default. All editable via existing `app_settings`.

## 2. Settings page additions
Add **Payroll & Tax Planning** section in `AdminSettings.tsx` with grouped fields. All read from `useGlobalSettings` extended with new keys + defaults.

New keys:
`fed_withholding_pct` (10), `oh_withholding_pct` (3.5), `local_withholding_pct` (2.5), `fica_employee_pct` (7.65), `fica_employer_pct` (7.65), `workers_comp_pct` (already exists global), `retirement_pct` (0), `retirement_enabled` (no), `retirement_note` (""), `pay_period_default` (weekly), `paystub_company_name`, `paystub_company_phone`, `paystub_company_address`.

## 3. Worker portal
Routes already started: `/worker/login`, `/worker/dashboard`. Add:
- `/worker/time` — list time entries + new entry form (job picker, date, start/end, notes). Uses existing RLS (worker inserts own pending).
- `/worker/paystubs` — list own paystubs, view detail with print stylesheet.
- `/worker/profile` — view + edit name/phone/email on own `workers` row (admin-controlled fields stay readonly).

Wrap with simple `WorkerLayout` providing nav + auth guard via `my_worker_id` lookup.

## 4. Paystub system
- `src/lib/paystubs.ts` — `computePaystub(hours, rate, settings)` returns full breakdown.
- New page `AdminPaystubs.tsx` — generate by selecting worker + date range; pulls approved unpaid time entries; preview; save; mark paid (sets entries `paystub_id` + `paid=true`).
- Detail/print view shared with `/worker/paystubs/:id`.
- PDF: use browser `window.print()` with print stylesheet (no new deps).
- Disclaimer banner on every paystub: "For internal tracking/planning unless processed through payroll provider."

## 5. Time entry workflow
- Admin time review section in `AdminWorkers.tsx` worker detail (or new `AdminTime.tsx`) — list pending, approve/reject/edit.
- Worker submits with `status='submitted'`; admin sets `approved`+`status='approved'` so it can flow into a paystub.

## 6. Personal expense logger
Already exists (`AdminPersonal.tsx` + `usePersonalExpenses`). Verify "owner draw" income flow stays.

## 7. Business / Personal page polish
- Business page: add "Operating Costs" subsection in section 4 pulling business `bills` by category buckets (insurance, tools, gas, advertising, permits, other).
- Confirm allocations preset for business uses business-only buckets (already seeded).
- Personal page already isolated.

## 8. Historical income import
- `AdminHistoricalIncome.tsx` — table + add form with all fields. Seed Jan-May 2026 totals via insert tool (one row per month, scope=business, already_spent=true, count_in_ytd=true, count_in_cash=false, source='manual_import', note about screenshots).
- Hook `useHistoricalIncome(scope, from, to)` returning ytdAmount + cashAmount split.
- Wire YTD totals into Reports.

## 9. Reports additions
Add tabs/sections in `AdminReports.tsx`:
- Payroll report (gross/deductions/net/employer cost from paystubs in range, owner vs non-owner split)
- Tax planning report (apply settings percentages to YTD gross owner pay + non-owner pay + business profit; show reserve targets vs set-aside from allocations)
- YTD report (current YTD income + historical imported income, separate "Current cash" line excluding already-spent)

## 10. Wording cleanup
Find/replace in dashboard/business/personal/reports/money labels:
- "Worker burden" → "Extra Worker Cost"
- "True worker cost" → "Total Cost to Business"
- "Owner pay" → "Owner-Worker Pay"
- "Owner draw" → "Owner Draw / Transfer to Personal"
- "Net profit" cards get sub-label clarifying "after Owner-Worker Pay" when applicable.

## 11. Workers page
Already has search/filter from prior pass. Add:
- YTD gross/net columns (from paystubs)
- Last paid date
- Documents checklist UI in worker detail (uses new `worker_documents` table; seed all 8 keys when worker created).

## 12. Application → Worker
Update `AdminApplications.tsx` "Approve" action to:
1. Create `workers` row from application data
2. Set `converted_worker_id`
3. Insert default 8 `worker_documents` rows (received=false)
4. Status → 'hired'
5. Show "Send invite" button (uses existing `worker-invite` edge function)

## 13. Out of scope
- No real payroll filing integration
- No new dependencies
- Retirement field labeled as planning only

## Files summary
- 1 migration (schemas)
- 1 insert call (seed historical + settings defaults)
- New: `src/lib/paystubs.ts`, `src/lib/useHistoricalIncome.ts`, `src/lib/useWorkerDocuments.ts`, `src/pages/admin/AdminPaystubs.tsx`, `src/pages/admin/AdminHistoricalIncome.tsx`, `src/pages/worker/WorkerLayout.tsx`, `src/pages/worker/WorkerTime.tsx`, `src/pages/worker/WorkerPaystubs.tsx`, `src/pages/worker/WorkerProfile.tsx`
- Edit: `App.tsx` (routes), `AdminLayout.tsx` (nav), `AdminSettings.tsx`, `useGlobalSettings.ts` (new keys), `AdminBusiness.tsx`, `AdminPersonal.tsx`, `AdminReports.tsx`, `AdminDashboard.tsx`, `AdminMoney.tsx`, `AdminWorkers.tsx`, `AdminApplications.tsx`, `WorkerDashboard.tsx`

After approval I'll run the migration first, then implement everything in one pass.
