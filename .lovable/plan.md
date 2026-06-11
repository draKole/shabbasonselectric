
# Finish Scaffolded Systems + Fix Money Flow

Scope is fix-and-finish only. No table renames, no rebuilds. Existing tables (`allocations`, `bill_occurrences`, `properties`, `personal_assignments`, `lead_notification_settings`, `owner_pay_transfers`, etc.) are already in place and will be reused.

---

## 1. Job Balance Bug (highest priority)

**Root cause:** `recompute_job_totals` only fires from `job_payments` and `job_total` change triggers. On `INSERT INTO jobs`, `amount_paid`/`balance_due` are never computed, so `balance_due` stays NULL until a payment touches the row.

**Fix:**
- Add `AFTER INSERT ON jobs` trigger → `recompute_job_totals(NEW.id)`.
- Extend `recompute_job_totals` to also subtract voucher credit applied (sum from `voucher_redemptions` where `job_id = _job_id`).
- Add `AFTER INSERT/UPDATE/DELETE ON voucher_redemptions` trigger → recompute affected job.
- Backfill once: `UPDATE jobs SET updated_at = now()` after deploying — actually call `recompute_job_totals` for every job in a one-shot SQL block in the migration.
- Add Admin Tools button "Recalculate Job Balances" → edge function `recompute-job-balances` that loops all jobs.
- Verify Jobs list, Job detail, Contact detail, Property detail, Dashboard, Reports all read `balance_due` from `jobs` (no local recomputes drifting).

---

## 2. Live Cash Views (foundation for everything else)

Two SQL views, computed on demand, never stored:

**`v_business_live_cash`** — single-row view:
- `+` job_payments.amount (non-void jobs)
- `+` voucher cash received (voucher_redemptions.cash_amount where status active/redeemed)
- `+` historical_income where `count_in_cash = true AND already_spent = false`
- `−` job_materials.cost where paid_by = 'me'
- `−` worker_payments.amount
- `−` bill_occurrences.amount where paid_status='paid' AND paid_from='business'
- `−` debt_payments.amount where source='business'
- `−` personal_expenses where source='business' (if any)
- `−` owner_pay_transfers.amount

**`v_business_assigned`** = sum of `allocations` rows where status='assigned' (not yet transferred/spent).
**`v_business_unassigned`** = live_cash − assigned.

**`v_personal_live_cash`**:
- `+` owner_pay_transfers.amount
- `+` manual personal_income rows
- `−` personal bill_occurrences paid
- `−` personal debt_payments
- `−` personal_expenses where source='personal'

**`v_personal_assigned`** = sum of `personal_assignments` where status='assigned'.

**`v_voucher_liability`** = sum of remaining credit on vouchers where status in ('active','partially_used').

Business page, Personal page, Money Tracker, Dashboard, Reports all switch to reading these views. Labels everywhere: Live Cash / Assigned / Unassigned / Transferred / Spent.

---

## 3. Recurring Bills — Monthly Occurrences

Keep existing `bill_occurrences` table. Fix the generator + UI.

- Edge fn `generate-bill-occurrences` returns `{created, existing}` and the Refresh button toasts "X created, Y already existed."
- Unique index `(bill_id, due_month)` to prevent duplicates.
- Auto-call generator on Bills page load (idempotent) so current month always exists.
- "Mark Paid" dialog asks: paid_date, paid_from (business/personal), payment_method, notes → writes to `bill_occurrences`.
- Past-due = unpaid occurrence whose due_date < today.
- Bills list groups by: This Month / Past Due / Upcoming / Paid This Month.
- Business bills only hit Business live cash; personal only hit Personal.

---

## 4. Weekly Allocation UI + Owner Pay Transfer

Tables exist; build the UI on Business page.

**"Run Weekly Allocation" button:**
- Reads `v_business_unassigned`.
- Pulls split from `allocation_presets` (default 85/10/5, editable in Settings).
- Shows preview modal: "Allocate $X — Owner Pay $0.85X, Overhead $0.10X, Reserve $0.05X for week of [Mon–Sun]".
- On confirm, inserts 3 `allocations` rows with `week_start`, `status='assigned'`.
- Guard: if a batch already exists for that week, show existing batch + "Reverse" (admin-confirm) instead of duplicating.

**Allocation semantics (per your spec):** allocations DO NOT reduce Live Cash, only Unassigned. They reduce Live Cash only when transferred/spent.

**"Transfer Owner Pay to Personal" button** (next to a pending owner-pay allocation):
- Inserts `owner_pay_transfers` row (amount, date, allocation_id).
- Updates allocation status → `transferred`.
- Both views recompute automatically (Business live cash −, Personal live cash +).

---

## 5. Personal & Business Assignments UI

Use existing `personal_assignments`; add `business_assignments` table if missing (same shape).

- Personal page: "Assign Money" panel — categories: Bills, Debt, Emergency, Car, Savings, Investing, Spending, Other. Amount + note + target (optional bill_id/debt_id).
- Business page: same panel — Business Bills, Business Debt, Reserve, Tools, Payroll Reserve, Insurance, Marketing, Permits/Software, Other.
- Status lifecycle: `assigned` → `spent` (auto when linked bill/debt marked paid) / `cancelled` / `reversed`.
- Assigned amounts reduce Unassigned but not Live Cash.

---

## 6. Worker Login — PIN Primary

Drop reliance on Supabase auth invite for primary path.

**Schema:** add to `workers`: `login_pin_hash text`, `login_status text default 'not_invited'` (not_invited / pin_created / active / disabled), `last_login_at timestamptz`.

**Admin "Create / Reset Worker Login" dialog:**
- Requires email OR phone. If neither → inline error "Worker needs an email or phone before login can be created."
- Generates 6-digit PIN, hashes it, stores hash, sets `login_status='pin_created'`.
- Shows copyable card: Portal URL `/worker`, identifier (phone/email), PIN. One-time reveal.
- "Reset PIN" regenerates.
- "Disable" sets status='disabled'.

**Worker login page `/worker/login`:**
- Input: phone or email + PIN.
- Edge fn `worker-pin-login` looks up worker by identifier, verifies PIN hash, mints a session via Supabase admin createUser/signIn-with-magic equivalent — or uses a signed JWT stored in localStorage that an RLS predicate `my_worker_id_from_jwt()` reads. Simpler: create a hidden auth user keyed to the worker on first PIN setup, then PIN endpoint issues a one-time magic link consumed silently.

**Worker dashboard hardening:** RLS already scopes via `my_worker_id()`. Add explicit denies for jobs/profit/admin tables. Audit dashboard component to ensure it only queries: own profile, own time entries, own paystubs, own savings, own assigned tasks.

**Admin → Worker Invite Logs:** new table `worker_invite_log(worker_id, action, success, error, actor_id, created_at)` written on every invite/reset/login attempt. Display in admin panel.

---

## 7. Twilio / SMS Lead Alerts

Twilio connector is linked; `TWILIO_API_KEY` is present. Likely failure: missing `TWILIO_FROM_NUMBER` setting, or `lead-alert` fn not parsing connector gateway correctly.

**Admin → Lead Alerts page additions:**
- Status grid: Twilio configured ✓/✗, Alert phone saved, From number saved, Last test status, Last error.
- Warning banners for SMS Geo Permissions + SMS Pumping Protection (linking to Twilio console).
- "Send Test SMS" button → edge fn `lead-alert-test` → returns exact Twilio response/error, written to `lead_alert_log`.
- Recent log table (last 20).

**`lead-alert` edge fn fixes:**
- Always insert lead first; SMS wrapped in try/catch.
- On failure, write to `lead_alert_log` with status='failed' and error text.
- Never throw back to the public form.
- Email fallback hook if alert_email set (no-op log if no email provider configured).

---

## 8. Voucher Delete / Void + Liability

- Add `status` enum values: active, partially_used, redeemed, void, refunded, cancelled (extend existing).
- Admin Vouchers row actions:
  - If no redemptions AND no linked job → "Delete" (hard delete, confirm).
  - Otherwise → "Void", "Cancel", "Refund" status changes only.
- Confirmation copy: "Are you sure? This removes/cancels this voucher and updates outstanding voucher liability."
- `v_voucher_liability` excludes void/refunded/cancelled/redeemed; surfaces remaining credit only.
- Surface liability on Business page and Money Tracker.

---

## 9. Legal Pages

New routes + footer links:
- `/privacy-policy`
- `/terms`
- `/service-policy`
- `/voucher-terms`

Plain-English content per your spec, professional and customer-friendly, with the attorney-review disclaimer at the bottom of each.

---

## 10. Business Health Check

Admin Tools → "Run Business Health Check" button → edge fn `business-health-check` returns structured findings:

Checks:
- Jobs with `job_total > 0 AND balance_due IS NULL`
- Jobs with payments not matching balance
- Orphan `job_payments` (no job)
- Active vouchers missing from liability rollup
- Redeemed/void vouchers still in liability
- Recurring bills missing current-month occurrence
- Duplicate `(bill_id, due_month)` occurrences
- Worker time entries with NULL worker_id or job_id
- Paystubs not linked to paid time entries
- `v_business_live_cash` < 0 or `v_personal_live_cash` < 0
- Allocations marked `transferred` without matching `owner_pay_transfers` row (and vice versa)
- `historical_income` where `already_spent=true AND count_in_cash=true`

Each finding: severity, count, "Fix" button where safe (e.g., generate missing occurrences).

---

## Technical / File Plan

**Migrations (one combined file):**
- Job balance: insert trigger on jobs, voucher_redemption triggers, extend `recompute_job_totals` for voucher credit, backfill loop.
- Views: `v_business_live_cash`, `v_business_assigned`, `v_business_unassigned`, `v_personal_live_cash`, `v_personal_assigned`, `v_voucher_liability` (all SECURITY INVOKER; GRANT SELECT to authenticated).
- `workers` columns: `login_pin_hash`, `login_status`, `last_login_at`.
- New tables: `business_assignments`, `worker_invite_log` (with GRANTs, RLS, policies per project pattern).
- Unique index `bill_occurrences(bill_id, due_month)`.
- Voucher status enum extension.

**Edge functions:**
- `recompute-job-balances` (admin one-shot)
- `worker-pin-create` (admin)
- `worker-pin-login` (public)
- `lead-alert` (fix)
- `lead-alert-test` (new)
- `business-health-check` (new)

**Frontend:**
- `src/pages/admin/AdminBusiness.tsx` — Live Cash card, Allocation panel, Transfer Owner Pay, Assignments panel, Voucher Liability card.
- `src/pages/admin/AdminPersonal.tsx` — Live Cash card, Assignments panel.
- `src/pages/admin/AdminMoneyTracker.tsx` — switch to views.
- `src/pages/admin/AdminBills.tsx` — Mark Paid dialog (paid_from/method/date/notes), grouping.
- `src/pages/admin/AdminVouchers.tsx` — delete/void/cancel/refund actions.
- `src/pages/admin/AdminWorkers.tsx` — Create/Reset PIN dialog, copyable info card, login status badge.
- `src/pages/admin/AdminLeadAlerts.tsx` — diagnostics grid, test button, log table.
- `src/pages/admin/AdminTools.tsx` (new or extend Settings) — Recalculate Job Balances + Run Health Check.
- `src/pages/worker/WorkerLogin.tsx` — phone/email + PIN form.
- `src/pages/Privacy.tsx`, `Terms.tsx`, `ServicePolicy.tsx`, `VoucherTerms.tsx` + Footer links + route registration.
- Hooks: `useLiveCash.ts`, `useAllocations.ts`, `useAssignments.ts`, `useHealthCheck.ts`.

**Out of scope:** Portfolio, public Vouchers marketing, Paystub math, Worker Savings math, Historical Income totals, Reports layout, Workers profile fields, existing Jobs/Contacts/Estimates/Calendar features.

---

## Manual Tests (after build)

1. Create new job with $500 total — balance shows $500 immediately on list and detail.
2. Add $100 payment → balance $400. Delete payment → balance $500.
3. Apply $50 voucher redemption → balance $450.
4. Click Refresh Bills twice — second click says "0 created, N already existed."
5. Mark a recurring bill paid this month — next month still shows unpaid.
6. Run Weekly Allocation on $1000 — Live Cash stays $1000, Unassigned becomes $0, three allocations appear.
7. Transfer Owner Pay $850 — Business Live Cash drops to $150, Personal Live Cash rises $850, allocation marked transferred.
8. Create worker with phone only → PIN created, login with phone+PIN works.
9. Lead Alerts → Send Test SMS, see Twilio response in UI. Submit public Schedule form with Twilio disabled → lead still saves.
10. Delete unused voucher; void used voucher; liability updates.
11. Run Health Check on clean db → all green.
