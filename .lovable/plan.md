# Plan: Monthly Reset + Properties + Invites + SMS + Allocation Cleanup

Scope is additive only. No table renames. Portfolio, Vouchers public, admin nav, Money Tracker, Reports, Workers/Paystubs/Bills/Debt/Estimates/Calendar UI shells, Business/Personal layouts stay intact and only get the new data wiring described below.

---

## 1. Property / Address Tracking (Jobs + Contacts)

**Schema (new migration)**
- New table `properties`:
  - `customer_id` (FK customers, on delete cascade)
  - `nickname`, `property_type` (enum text: `personal_home | investment | rental | commercial | nonprofit | other`)
  - `owner_name`, `owner_phone`
  - `address`, `city`, `state` (default 'OH'), `zip`
  - `notes`, `is_primary` boolean
  - timestamps, RLS admin-only + worker read via job link
- `jobs.property_id uuid` (nullable, FK properties)
- Data migration: for every distinct (`customer_id`, normalized address) on existing jobs, create one `properties` row and set `jobs.property_id`. First property per customer = `is_primary`. Existing job address fields left untouched for backward compatibility.

**UI**
- `useProperties(customerId)` hook.
- Job create/edit dialog: contact picker → property picker (existing list for that customer) → "Add new property" inline form (type, nickname, owner, address, notes). If only one property, auto-select with "Change" link.
- Quick Add Job mirrors the same flow.
- Job detail header shows: customer name, property type badge, full address, nickname.
- Contact detail page: new "Properties" section grouping jobs under each property; add/edit/delete property buttons.

---

## 2. Monthly Reset for Workers / Paystubs / Savings

No schema change. All queries already have date columns (`worker_time_entries.work_date`, `paystubs.period_start/end`, `worker_savings_ledger.created_at`, `worker_payments.paid_on`).

- New shared hook `usePeriodFilter()` returning `{ range, setRange, from, to }` for: `this_week | this_month | last_month | ytd | all`.
- Persist selection per-page in `localStorage` (default `this_month`).
- Update Workers list page + worker cards to read totals scoped to the active range (hours, earned, paid, balance owed). Add range toggle in page header.
- Same toggle added to Paystubs list, Worker Savings, Worker Payments, Extra Worker Cost, Owner-Worker pay views.
- Worker detail page: monthly summary row + a "YTD" expandable section so YTD stays accessible.
- Reports monthly cards already month-scoped; just confirm they share the same `from/to` helpers.

---

## 3. Worker Invite Edge Function Fix

**Root-cause checks**
- Read `supabase/functions/worker-invite/index.ts` end-to-end; add the function to `supabase/config.toml` with `verify_jwt = false` and validate JWT in code using `getClaims` (current platform default for signing-keys).
- Ensure admin check uses `has_role(auth.uid(), 'admin')` via service-role client (current anon client can't read user_roles reliably across all configs).
- Wrap every failure path to return JSON `{ error, code, detail }` with status 400/401/403/500 (never throw a bare 500).

**Behavior**
- If worker missing both email and phone → 400 `"Worker needs an email or phone before invite can be created."`
- If `auth.admin.listUsers` finds an existing user with that email → branch to password reset link (`generateLink({ type: 'recovery' })`) and return `{ mode: 'reset', actionLink }`.
- Else create user with temp password, set `workers.auth_user_id`, `workers.invite_status = 'invited'`, return `{ mode: 'new', email, tempPassword, portalUrl }`.
- On successful first login, separate trigger or RPC flips `invite_status = 'active'` (already partially wired — verify).

**Client (`AdminWorkers` / worker detail)**
- Catch `FunctionsHttpError`, read `error.context.response.json()` and surface the real message in a toast.
- Show modal with copyable Portal URL + login info + "Copy all" button.
- Re-invite button visible when `invite_status in ('invited','active')`.

---

## 4. SMS Lead Alerts (Twilio Connector)

**Setup**
- Use `standard_connectors--connect` for `twilio` (user already picked Twilio connector).
- New table `lead_notification_settings` (single-row, admin-only):
  - `sms_enabled`, `alert_phone`, `alert_email`
  - `notify_service_request`, `notify_contact_form`, `notify_voucher_request`, `notify_application`, `notify_estimate_request` (booleans)
  - `from_number` (Twilio number)
- New edge function `lead-alert`:
  - Input: `{ lead_type, name, phone, service, address_city }`
  - Loads settings, checks toggle for that lead type.
  - If Twilio connector creds present → POST to gateway `/Messages.json`.
  - If not configured → return `{ ok: true, sent: false, reason: 'sms_not_configured' }`.
  - Always returns 200 unless settings load fails; never blocks the originating insert.
- New edge function `lead-alert` is fire-and-forget invoked from existing public submit handlers (service request, schedule, contact form, voucher request, application). Lead row is committed first; alert is invoked after — wrapped in try/catch so failures don't break submission.
- Settings UI: new card "Lead Notification Settings" inside the Settings page with all toggles, phone, email, status badge ("SMS provider not connected" / "Connected • +1…").
- Failed sends logged to a small `lead_alert_log` table (lead_type, ok, error, sent_at) shown in an Admin alerts list under Settings.

Message: `New Shabba Electric Lead: {Name}, {Phone}, {Service}, {Address/City}. Open admin to follow up.`

---

## 5. Recurring Bills — Per-Month Occurrences

**Schema (new migration)**
- New table `bill_occurrences`:
  - `bill_id` (FK bills, cascade)
  - `period_month` (date, first of month)
  - `due_date`
  - `amount` (copied from bill at generation; editable)
  - `paid` boolean, `paid_on` date, `paid_amount`
  - `notes`
  - unique (`bill_id`, `period_month`)
  - admin RLS
- Edge function `generate-bill-occurrences` (idempotent): for every active recurring bill, ensure an occurrence exists for the current month (and any missed months back to bill creation, capped at 12). Called:
  - On app load (admin-only, throttled to once per day per browser).
  - From a `pg_cron` job at 00:05 on the 1st of each month via `pg_net` (use insert tool, not migration).
- One-time backfill in the migration: for existing recurring bills, create an occurrence for the current month using their current `paid` state.
- Non-recurring bills: ignore — keep working off `bills` row directly.

**UI**
- Bills page reads occurrences for the selected month (default current). Cards show "This month / Paid this month / Remaining this month / Past due unpaid (all prior months unpaid) / YTD paid".
- "Mark paid" toggles the occurrence, not the parent bill.
- Both business and personal bill views use the same model (filtered by `bill_type`).

---

## 6. Weekly Allocation + Owner Pay Transfer

**Schema (new migration)**
- New table `allocations`:
  - `period_week` (date, Monday of week)
  - `source_type` (`job_payment | manual_business | manual_personal`)
  - `source_id` (nullable)
  - `gross_amount`, `direct_costs`, `net_amount`
  - `owner_pay_amount`, `overhead_amount`, `reserve_amount`
  - `status` (`unallocated | allocated | transferred | spent | locked`)
  - `notes`, timestamps
- Settings: add `business_split_owner_pct` (85), `business_split_overhead_pct` (10), `business_split_reserve_pct` (5) to `app_settings`, editable from Settings page (whitelist already allows specific keys — add these to read whitelist).
- New table `owner_pay_transfers`:
  - `allocation_id`, `amount`, `transferred_on`, `status` (`pending | paid`), `notes`.
  - Marks owner-pay portion that has moved from Business → Personal.
- New table `personal_assignments`:
  - `source_transfer_id` (FK owner_pay_transfers, nullable for other income), `target_type` (`bill_occurrence | debt | emergency | other`), `target_id`, `amount`, `status` (`assigned | paid | spent`), timestamps.

**Logic**
- New helper `useWeeklyAllocation()`:
  - Pulls unallocated job payments (existing `job_payments`) for the week.
  - For each: net = payment − (materials + worker labor + owner-worker pay + permits + other_expenses tied to that job, week-scoped).
  - Splits net by settings into owner / overhead / reserve.
  - Auto-runs at week close (Friday) if not manually allocated — implemented via the same daily cron used for bill occurrences.
- Owner-pay transfer flow: button "Transfer to Personal" on allocation → creates `owner_pay_transfers` row, marks allocation `transferred`, increases Personal available cash.
- Business page totals (`useBusinessTotals`) reads:
  - Cash available = sum allocations(unallocated|allocated, not transferred/spent) + overhead + reserve
  - Assigned to business bills = sum bill_occurrences assigned + unpaid
  - Paid this month / remaining / reserve / overhead / unassigned — all derived from allocations & occurrences.
- Personal page totals (`usePersonalTotals`) reads:
  - Income available = sum owner_pay_transfers(paid) + other personal income − sum personal_assignments(paid|spent)
  - Assigned to bills/debt = personal_assignments(assigned)
  - Paid bills/debt = personal_assignments(paid)
  - Emergency fund = personal_assignments(target_type='emergency', status in (assigned,paid))
  - Remaining unassigned = income available − assigned − paid
- Status enforcement: a single SQL view `v_allocation_available` returns only rows where status in (`unallocated`,`allocated`). UI never reads transferred/spent rows as "available."

---

## 7. Reports Reconciliation
- No structural change. Confirm:
  - Monthly cards use `usePeriodFilter` with `this_month`.
  - YTD pulled separately via `ytd` range.
  - Historical income flagged `already_spent` excluded from allocation feed (already done last cycle — re-verify).
  - Business vs personal totals query the new allocation tables, not raw job_payments.
  - Owner-pay transfers appear in both: Business as outflow (`owner_pay_paid`) and Personal as inflow.

---

## Technical Details

**New migrations (in order)**
1. `properties` table + `jobs.property_id` + backfill.
2. `bill_occurrences` table + RLS + current-month backfill.
3. `allocations`, `owner_pay_transfers`, `personal_assignments` tables + RLS + `v_allocation_available` view + split-pct settings keys.
4. `lead_notification_settings` (single row) + `lead_alert_log` + RLS.

**New edge functions**
- `lead-alert` (Twilio gateway sender).
- `generate-bill-occurrences` (cron + on-demand).
- `weekly-allocation-run` (cron + on-demand).
- Fix `worker-invite` (config.toml entry, service-role admin check, structured errors, reset-mode branch).

**Twilio**
- Use `standard_connectors--connect` with `connector_id: twilio`. After link, `TWILIO_API_KEY` + `LOVABLE_API_KEY` are available to edge functions. From-number stored in `lead_notification_settings.from_number`.

**Cron**
- Use `supabase--insert` (not migration) to register two pg_cron jobs hitting the new edge functions (bill occurrences daily 00:05, allocation Friday 23:00).

**Front-end files (new/edited)**
- New: `src/lib/useProperties.ts`, `usePeriodFilter.ts`, `useBillOccurrences.ts`, `useAllocations.ts`, `useOwnerPayTransfers.ts`, `usePersonalAssignments.ts`, `useLeadAlertSettings.ts`.
- New pages/sections: `AdminLeadSettings` card inside Settings, properties section in contact detail, property picker in job dialogs.
- Edited: `AdminJobs*`, `AdminContacts*` detail, `AdminWorkers*`, `AdminPaystubs`, `AdminWorkerSavings`, `AdminBills`, `Business`, `Personal`, `AdminReports`, public form pages (`Schedule.tsx`, `Contact*`, `ServiceVouchers` request flow, `Apply*`) to invoke `lead-alert`.
- `worker-invite/index.ts` rewrite + `supabase/config.toml` entry.

---

## Out of scope (will not touch)
- Portfolio editor, public Vouchers pages, admin sidebar nav, Money Tracker UI, Estimates, Calendar, Debt page UI (numbers update automatically through allocations).

## Manual tests to run after build
1. Create a contact, add 2 properties, create jobs against each — verify both show on contact detail and on job header.
2. Click Create Worker Login on a worker missing email → expect clear error message; add email, retry → copyable creds modal.
3. Submit a public Schedule form → SMS arrives at alert phone; toggle SMS off → no SMS, lead still saved, no error toast.
4. Mark a recurring bill paid in current month → flip system clock to next month (or wait) → bill shows unpaid again, prior month still shows paid.
5. Add a job payment, leave it unallocated, run "Allocate week" → owner/overhead/reserve split appears; click "Transfer to Personal" → Personal available cash increases, Business available cash decreases.
6. Assign personal cash to a bill → mark paid → remaining personal cash drops, paid total rises, allocation no longer shows as available.
7. Switch worker page filter to "Last month" → totals match historical; switch to "This month" on the 1st → resets to $0.

## Known limitations
- Twilio SMS Geo Permissions & Pumping Protection must be enabled in Twilio console manually.
- Bill occurrence generation depends on the daily cron running; if cron is paused, opening Admin triggers a catch-up.
- Allocation auto-run on Friday assumes server timezone UTC; week boundary may shift ±1 day for late-night EST entries (acceptable).
