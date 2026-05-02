# Shabba & Sons Electric — Website + Job Management System

A mobile-first marketing site plus a private admin dashboard you can run your business from on your phone. Built on Lovable Cloud (database, file storage, admin auth).

## What customers see

**Homepage**
- Hero: "Columbus Electrical Repairs, Panels, Lighting & New Construction Wiring" with Schedule, Call (614-671-8528), and Text buttons
- Trust badges: Father & Son, 40+ Years Combined, Permit-Ready, Free Estimates
- Service cards grid (12 services)
- Recent Work portfolio preview (pulled live from completed jobs marked public)
- Reviews preview (pulled live from approved reviews)
- Final CTA strip
- Sticky mobile bar always visible: Call · Text · Schedule

**Services page** — Each service (Repairs, Panels, Lighting, Outlets/GFCI, New Construction/Remodel, Contractor/Permit Support) gets its own section with description, common work bullets, and a "Schedule" button.

**Schedule Service page** — The booking form. Sections: Customer info → Job location → Job type → Urgency → Preferred date/time + alternate → Description + photo upload (optional, up to 10 photos at 10MB each) → Materials/permit/power questions → Customer type → Estimate preferences. Submits to the database as a New Lead. Confirmation screen with your phone number for urgent jobs.

**Portfolio page** — Filterable by category (New Construction, Panels, Service Changes, Lighting, Outlets/GFCI, Troubleshooting, Remodel, Commercial, Contractor Support, Inspection-Ready). Each project: before/after photos, city/neighborhood, services performed, optional linked review.

**Reviews page** — All approved reviews with rating, customer name, neighborhood, service type, date. Link out to leave a Google review.

**Contractor / Permit Support page** — Dedicated page for contractors, landlords, investors. Includes the safety/code disclaimer wording exactly as you wrote it.

**About + Contact** — Father-and-son story, service area (Columbus + surrounding, no private address), contact form, Call/Text/Schedule buttons.

## What you see (Admin)

Private, password-protected. You log in with email + password.

**Dashboard** — Top cards: New leads this week · Jobs scheduled this week · Jobs completed this month · Open estimates · Review requests needed · Open balance. Below: a reminders panel (overdue follow-ups, deposits unpaid, leads not contacted in 24h, jobs not updated in 3 days) and a "Quick Add Job" button that creates a job in under 60 seconds from your phone (name, phone, address, type, date/time, price, notes).

**Lead Pipeline (Kanban board)** — Drag-and-drop columns: New Lead → Need to Reply → Estimate Scheduled → Estimate Sent → Waiting on Approval → Approved → Deposit Needed → Scheduled → In Progress → Waiting on Inspection → Completed → Paid → Review Requested. Status changes auto-log to the job timeline.

**Jobs table** — All jobs with filters and the columns you listed (customer, phone, address, type, status, scheduled date, estimate, balance, permit, inspection, last contact, action).

**Job Details page** — Everything for one job on one screen: customer info, job info, description + customer/admin photos (before/after), pricing breakdown, permit & inspection tracking (number, type, date, result, corrections), materials (needed, bought, vendor, receipt upload, cost), timeline of every status change. Action buttons: Call, Text (opens iPhone Messages with pre-filled message), Send Estimate, Mark Scheduled, Add to Calendar, Mark Completed, Request Review, Add to Portfolio, Archive.

**Calendar page** — Day / Week / Month / List views. Color-coded by status (gray/blue/green/yellow/orange/black/red for urgent). Each event shows customer, type, address, time, phone, price, notes. Click → opens job. You can also create non-job events: Estimate, Service Call, Rough-In, Trim-Out, Panel Upgrade, Service Change, Inspection, Material Pickup, Follow-Up, Final Walkthrough.

**Calendar export (v1)**
- "Add to Google Calendar" button per job (opens Google's add-event URL pre-filled)
- "Download .ics" button per job (works with Apple Calendar, Outlook, anything)
- Subscribable ICS feed URL for the whole calendar — paste once into Google or Apple Calendar and all your jobs auto-update going forward
- Separate feed URLs by category: Estimates / Active Jobs / Inspections / Material Pickups / Follow-Ups
- Event format exactly as you specified (title, location, full description with customer/phone/notes/permit/balance)

(Full two-way Google Calendar sync deferred to a later phase per your preference.)

**Estimate / Quote Builder** — Templates for Service Call, Panel Upgrade, Service Change, Lighting Install, Outlet/GFCI, Shed Feed, Hot Tub Circuit, Remodel, New Construction, Contractor Support. Builds a clean text-message-ready quote in your exact format. Buttons: Copy Text, Send by SMS (opens Messages app with text pre-filled), Mark Sent, Mark Approved, Convert to Job.

**Review Request Center** — When a job is marked completed, you get prompted "Send review request?" Pre-written Google and Nextdoor message templates (your exact wording). Tap to open Messages with the text pre-filled. Tracks requested/received status, platform, rating, text, and whether to publish to the website.

**Portfolio manager** — One click to promote a completed job to the public portfolio. Choose category, write description, pick before/after photos, toggle public visibility, link a review.

## Design

- Mobile-first (iPhone primary), white main sections, charcoal accents, electric-blue highlights, safety-yellow accents, green for Schedule/Call buttons, gray cards
- Clean modern contractor feel — professional, local, real, not corporate or AI-looking
- Sticky Call/Text/Schedule bar on mobile across all customer pages

## SEO

Page titles and meta as you specified. Schema markup for LocalBusiness (Electrician), service area (Columbus, OH), phone, hours. Targeting your keyword list (Electrician Columbus Ohio, panel upgrade, GFCI, etc.).

## Build order

1. Database + admin login
2. Homepage + Services + Schedule form (so you can start collecting leads immediately)
3. Admin dashboard + Jobs table + Job Details + Quick Add
4. Calendar page + ICS export/feed + Add-to-Google buttons
5. Pipeline Kanban board
6. Estimate builder
7. Review Request Center
8. Portfolio (public + manager)
9. Contractor/Permit Support, About, Contact, Reviews pages
10. SEO polish + sticky mobile bar QA

## Technical details

- **Stack**: React + Vite + Tailwind + shadcn/ui, React Router, Lovable Cloud (Postgres + Storage + Auth)
- **Auth**: Email/password for admin only; customer side is public. Roles stored in a separate `user_roles` table (never on profiles) with a `has_role()` security definer function for RLS — only admins can read/write jobs, customers, estimates, etc.
- **Storage**: Two buckets — `customer-uploads` (public-read for portfolio use, write via signed policies from the booking form) and `job-photos` (admin-only)
- **Database tables**: `customers`, `jobs`, `job_photos`, `estimates`, `reviews`, `calendar_events`, `reminders`, `portfolio_projects`, `job_timeline_events`, `user_roles` — schemas as you outlined, with RLS on every table
- **ICS feed**: Edge function generates RFC-5545 ICS on demand from `jobs` + `calendar_events`. Feed URL includes a per-admin secret token so only you can subscribe. Category-specific feeds use a query param.
- **SMS**: All "Text" buttons use `sms:` links with `?body=` pre-fill so iPhone Messages opens ready to send. No Twilio cost.
- **Reminders**: Computed on dashboard load from job timestamps and statuses (no background jobs needed in v1).
- **Photo uploads**: Client-side validation (max 10 files, 10MB each, image types only), uploaded directly to Storage with signed URLs.

## Things I'll need from you after build

- Your Google Business review link (for the review request templates and Reviews page button)
- Confirm whether your son needs his own admin login
- Real photos for the homepage hero and a few portfolio examples (or I'll use placeholders you can swap)
