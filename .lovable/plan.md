# Shabba Electric Hub — Next Improvement Pass

Scope: additive only. Will not touch Money Tracker math, Reports, Bills, Debt, Contacts, or working Estimate flows beyond what is listed. No van inventory.

## 1. Database migration (one migration, additive only)

New columns / tables:
- `workers`: add `is_owner boolean default false`, `weekly_salary numeric default 0`, `pay_schedule text default 'weekly'`, `pay_day text default 'friday'`, `pay_mode text default 'hourly'` (`hourly` | `salary` | `both`), `worker_type text default 'helper'` (`helper`|`electrician`|`subcontractor`|`owner`), `onboarding jsonb default '{}'` (insurance, wc, w9, id, ppe, tools, start_date booleans/date), `auth_user_id uuid` (for portal login), `invite_status text default 'none'`.
- `worker_time_entries`: add `approved boolean default false`, `paid boolean default false`, `paid_at timestamptz`.
- `job_payments` already tracks customer pay — leave alone.
- New `app_settings` keys: `owner_worker_id`, `owner_default_hourly`, `owner_weekly_salary`, `owner_pay_day`, `owner_pay_mode`, `owner_pay_reduces_profit`, `estimate_valid_days`, `estimate_default_deposit_pct`, `estimate_discount_label`, `estimate_show_original`, `estimate_show_discount`, `estimate_show_final`, `estimate_show_materials_note`.
- RLS: add policy on `workers`, `job_tasks`, `worker_time_entries`, `jobs`, `job_photos` so a worker (auth user matching `workers.auth_user_id`) can read/write only their own assigned data. Use a `is_worker_for_job(_uid, _job_id)` security-definer function.

## 2. Owner-as-worker

- Settings → "Owner pay" card: pick which worker is the owner, set hourly + weekly salary + pay day + pay mode + reduces-profit toggle.
- `useMonthMoney`: split labor into `ownerPay` vs `workerLabor` based on `is_owner`. Add `businessNetAfterOwner` and `personalOwnerPay`.
- Money Tracker + Reports: show new rows (Owner pay, Business net after owner pay, Personal owner pay).

## 3. Worker portal foundation

- Routes: `/worker/login`, `/worker/dashboard` (public routes outside admin shell).
- `WorkerLogin.tsx`: email/password (Supabase auth, no signup — invite only).
- `WorkerDashboard.tsx`: lists jobs where worker has assigned tasks or time entries, shows address/date/scope (NOT money fields), tasks list with complete toggle, "Log hours" form (creates entry with `approved=false`), photo upload to `job-photos`, weekly hours + estimated pay (hours × rate, owner uses owner rate).
- Admin Workers page: "Send invite" button → calls edge function `worker-invite` that creates auth user via service role, generates random pw, sets `workers.auth_user_id`, returns temp credentials to admin to share. "Reset invite" regenerates. "Deactivate" sets `active=false`.

## 4. Estimate builder — discount + clean format

- Line item shape extended: `{ title, description, qty, unit_price, discount, final_unit_price, materials_included, customer_supplied }`.
- AdminEstimates editor: per-line original price, discount amount (or %), auto-calc final. Show original subtotal, total discount, final total, deposit, balance.
- `EstimateShare.tsx` rewrite of layout to the clean "SCOPE OF WORK — ELECTRICAL" format the user pasted, supporting bullet lists from `description` (split on newlines). Print stylesheet polish. No literal `\n`.
- Settings toggles control which columns/rows are visible.

## 5. Hours approval + payroll

- Admin Workers page: tabs for "Time entries", with filters Pending / Approved / Paid. Bulk approve, mark paid, edit, delete. Weekly total per worker.
- `useMonthMoney` only counts `approved=true` entries in profit math; pending shown separately on Money Tracker.

## 6. Application → Worker conversion polish

- AdminApplications convert dialog: add fields for hourly rate, worker_type, onboarding checklist (insurance/wc/w9/id/ppe/tools/start date), and "Send portal invite" checkbox.

## 7. Out of scope (explicit)

- No van/tool inventory. No messaging. No new payroll filing/tax features beyond tracking flags.

## Files touched

New:
- `supabase/migrations/<ts>_owner_worker_portal.sql`
- `supabase/functions/worker-invite/index.ts`
- `src/pages/worker/WorkerLogin.tsx`
- `src/pages/worker/WorkerDashboard.tsx`
- `src/components/admin/OwnerPaySettings.tsx`
- `src/components/admin/WorkerInviteDialog.tsx`
- `src/components/admin/TimeEntryApproval.tsx`

Edited:
- `src/App.tsx` (worker routes)
- `src/lib/useGlobalSettings.ts` (new keys)
- `src/lib/useMonthMoney.ts` (owner split, approved-only)
- `src/pages/admin/AdminSettings.tsx` (owner + estimate setting cards)
- `src/pages/admin/AdminWorkers.tsx` (invite, approval, owner flag)
- `src/pages/admin/AdminMoney.tsx` + `AdminReports.tsx` (owner pay rows)
- `src/pages/admin/AdminEstimates.tsx` (line item editor with discount)
- `src/pages/EstimateShare.tsx` (new clean layout)
- `src/pages/admin/AdminApplications.tsx` (convert dialog onboarding fields)

## Final deliverable

Checklist of: existed/left alone, fixed, newly added, needs manual testing, known issues.
