import { BUSINESS } from "./business";

export type SmsTemplate = {
  id: string;
  label: string;
  body: (vars: SmsVars) => string;
};

export type SmsVars = {
  customerName?: string;
  date?: string;
  time?: string;
  amount?: string;
  address?: string;
  reviewUrl?: string;
};

const sig = `\n— ${BUSINESS.name}\n${BUSINESS.phone}`;

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "on_my_way",
    label: "On My Way",
    body: (v) =>
      `Hi ${v.customerName || "there"}, this is ${BUSINESS.shortName}. I'm on my way to ${v.address || "your address"} now. See you shortly.${sig}`,
  },
  {
    id: "running_late",
    label: "Running Late",
    body: (v) =>
      `Hi ${v.customerName || "there"} — running about 15-20 min behind. I'll be there as soon as I can. Thanks for your patience.${sig}`,
  },
  {
    id: "appt_confirm",
    label: "Confirm Appointment",
    body: (v) =>
      `Hi ${v.customerName || "there"}, confirming your appointment on ${v.date || "[date]"} at ${v.time || "[time]"}. Reply YES to confirm or call to reschedule.${sig}`,
  },
  {
    id: "estimate_sent",
    label: "Estimate Sent",
    body: (v) =>
      `Hi ${v.customerName || "there"}, here's your estimate for the work at ${v.address || "your property"}. Total: $${v.amount || "[amount]"}. Let me know if you'd like to move forward.${sig}`,
  },
  {
    id: "deposit_request",
    label: "Deposit Request",
    body: (v) =>
      `Hi ${v.customerName || "there"}, to schedule your job we'll need a deposit of $${v.amount || "[amount]"}. Zelle: ${BUSINESS.phone}. Once received, I'll lock in your date.${sig}`,
  },
  {
    id: "job_complete",
    label: "Job Complete + Balance",
    body: (v) =>
      `Hi ${v.customerName || "there"}, the work is complete. Balance due: $${v.amount || "[amount]"}. Zelle to ${BUSINESS.phone} or Cash App. Thank you for your business.${sig}`,
  },
  {
    id: "review_request",
    label: "Review Request",
    body: (v) =>
      `Hi ${v.customerName || "there"}, thanks again for choosing ${BUSINESS.shortName}. A quick Google review would mean the world: ${v.reviewUrl || BUSINESS.googleReviewUrl}${sig}`,
  },
  {
    id: "permit_inspection",
    label: "Inspection Scheduled",
    body: (v) =>
      `Hi ${v.customerName || "there"}, your inspection is scheduled for ${v.date || "[date]"} at ${v.time || "[time]"}. Please make sure someone 18+ can be home for the inspector.${sig}`,
  },
  {
    id: "follow_up_lead",
    label: "Follow Up Lead",
    body: (v) =>
      `Hi ${v.customerName || "there"}, just following up on your electrical request. Still interested? Happy to answer any questions or get you scheduled.${sig}`,
  },
];
