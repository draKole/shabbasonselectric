# Plan: Employee Savings Deduction + Prepaid Service Vouchers

Two independent additive systems. No existing tables renamed. No working features removed.

## PART 1 — Employee Savings Deduction (worker-owned)

### Database (migration)
- `workers`: add `savings_enabled bool`, `savings_type text` (percent|fixed|manual), `savings_pct numeric`, `savings_fixed numeric`, `savings_auth_received bool`, `savings_auth_date date`, `savings_destination text`, `savings_notes text`
- `paystubs`: add `employee_savings numeric default 0`
- New table `worker_savings_ledger`: `worker_id, entry_date, txn_type (withheld|released|sent|adjustment|correction), amount, paystub_id nullable, method, notes, created_at`. RLS: admins all; workers read own.
- `app_settings`: new keys `savings_enabled_default`, `savings_default_type`, `savings_default_pct`, `savings_default_fixed`, `savings_require_auth`, `savings_policy_text`, `savings_destination_note`

### Code
- `src/lib/paystubs.ts`: add `employee_savings` to breakdown; subtract from net (not gross). Disclaimer unchanged.
- `src/lib/useGlobalSettings.ts`: defaults for new keys.
- `AdminSettings.tsx`: new Payroll → Employee Savings card.
- `AdminWorkers.tsx`: Employee Savings section on worker detail (enable, type, %/$ , auth, destination, notes). Show withheld this period / YTD / released / balance from ledger.
- `AdminPaystubs.tsx`: when computing paystub, pull worker savings config, compute deduction, save to paystub, create matching `worker_savings_ledger` row (`withheld`).
- New `src/lib/useSavingsLedger.ts` hook for balances + transactions.
- New admin actions on worker card: Release to worker, Mark sent to destination, Add correction (insert ledger rows).
- `WorkerDashboard.tsx`: Savings card (current balance, period, YTD, history, policy text). Read-only.
- `AdminReports.tsx` Payroll tab: totals withheld, held/owed, released, by worker, YTD. Business tab: liability line "Owed to workers (savings)" — does NOT add to profit.
- Allocation logic (`useAllocations`): savings balance treated as obligation, not available cash.

## PART 2 — Prepaid Service Vouchers (customer prepayment)

### Database (migration)
- New `voucher_offers`: `name, amount_paid, credit_value, bonus, labor_only bool, materials_included bool, min_job_size, max_per_job, active, terms, display_order`
- New `service_vouchers`: `code (unique), customer_id, customer_name_snapshot, offer_id, amount_paid, credit_value, credit_used numeric default 0, purchase_date, expires_on date null, status (active|partial|redeemed|void|refunded), payment_method, notes`
- New `voucher_redemptions`: `voucher_id, job_id, amount_applied, applied_on, notes`
- New `voucher_requests` (public, anon insert): `customer_name, phone, email, offer_id, notes, status, created_at`
- `app_settings`: `voucher_default_terms`, `voucher_min_schedule_days` (default 7)
- Seed 3 default offers ($200→$350, $500→$800, $1000→$1500).
- RLS: admins manage; voucher_requests + voucher_offers public-read for offers / anon-insert for requests.

### Code
- New `AdminVouchers.tsx`: dashboard with filters (active/redeemed/partial/void/refunded/expiring), list, create voucher, void/refund, apply to job, voucher detail.
- New `AdminVoucherOffers.tsx` (in settings or vouchers page tab): manage offers.
- New `src/pages/ServiceVouchers.tsx` public page at `/service-vouchers` (and `/vouchers` alias): show active offers, request form.
- New `src/components/admin/VoucherCertificate.tsx` printable.
- `AdminJobDetails.tsx`: "Apply Voucher" button (search by code/customer, choose amount). Insert into `voucher_redemptions`, update voucher status/credit_used.
- `AdminEstimates.tsx`: show "Voucher Credit Applied" line on estimate output.
- `AdminBusiness.tsx` + `AdminReports.tsx`: cards for Voucher cash collected, Voucher liability outstanding, Voucher credits redeemed this month, expired/void.
- `useAllocations.ts`: subtract outstanding voucher liability from available cash.
- `App.tsx`: register routes for `/service-vouchers`, `/admin/vouchers`.
- `AdminLayout.tsx`: add "Vouchers" nav link.
- New `src/lib/useVouchers.ts` hook.

## PART 3 — Separation Guarantees
- Savings ledger and voucher tables are fully independent.
- Savings: reduces net pay only, increases worker liability.
- Vouchers: cash in counts toward cash but creates customer liability; redeemed credit becomes earned labor revenue.
- Both reflected in Reports as separate liabilities — never as profit.

## Execution order
1. Run migration (one combined migration: workers fields, paystubs field, savings ledger, voucher tables/offers/requests/redemptions, new app_settings rows, seed defaults).
2. Update settings hook + paystubs lib.
3. Update AdminSettings, AdminWorkers, AdminPaystubs, WorkerDashboard, AdminReports.
4. Add voucher pages, hook, routes, nav, job/estimate integrations.
5. Update allocations + business page.

After approval: I'll write the migration first (single call), then implement code in parallel batches.
