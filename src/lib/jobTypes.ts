export const JOB_TYPE_LABELS: Record<string, string> = {
  electrical_repair: "Electrical Repair",
  troubleshooting: "Troubleshooting",
  panel_upgrade: "Panel Upgrade",
  service_change: "Service Change",
  lighting_installation: "Lighting Installation",
  outlet_switch_gfci: "Outlet / Switch / GFCI",
  dedicated_circuit: "Dedicated Circuit",
  ceiling_fan: "Ceiling Fan",
  security_camera: "Security Camera",
  tv_outlet: "TV Outlet",
  remodel_wiring: "Remodel Wiring",
  new_construction: "New Construction",
  inspection_permit_support: "Inspection / Permit Support",
  contractor_support: "Contractor Support",
  other: "Other",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  estimate_scheduled: "Estimate Scheduled",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  down_payment_needed: "Down Payment Needed",
  materials_needed: "Materials Needed",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  waiting_on_permit: "Waiting on Permit",
  waiting_on_inspection: "Waiting on Inspection",
  ready_for_inspection: "Ready for Inspection",
  inspection_passed: "Inspection Passed",
  final_needed: "Final Needed",
  completed: "Completed",
  paid: "Paid",
  review_requested: "Review Requested",
  archived: "Archived",
  cancelled: "Cancelled",
  lost_lead: "Lost Lead",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit Paid",
  partial: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  unpaid: "bg-muted text-foreground",
  deposit_paid: "bg-secondary/15 text-secondary",
  partial: "bg-accent/30 text-accent-foreground",
  paid: "bg-success text-success-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export const STATUS_HELP: Record<string, string> = {
  new_lead: "Someone requested work but it is not confirmed yet.",
  contacted: "I replied or called them.",
  estimate_scheduled: "I'm going to look at the job.",
  estimate_sent: "I gave them a price.",
  approved: "They accepted; the job is on the calendar.",
  scheduled: "Job is on the calendar.",
  in_progress: "I started the work.",
  materials_needed: "Job is paused until materials are ready.",
  waiting_on_inspection: "Work is done but inspection is needed.",
  completed: "Work is finished.",
  paid: "Customer paid in full.",
  cancelled: "Job was cancelled.",
  lost_lead: "Customer did not move forward.",
  archived: "Hidden from active jobs but kept in records.",
};

// Color tokens (HSL via tailwind tokens) for calendar/status pills
export const STATUS_COLOR: Record<string, string> = {
  new_lead: "bg-muted text-foreground",
  contacted: "bg-muted text-foreground",
  estimate_scheduled: "bg-secondary/15 text-secondary",
  estimate_sent: "bg-secondary/15 text-secondary",
  approved: "bg-success/15 text-success",
  down_payment_needed: "bg-accent/30 text-accent-foreground",
  materials_needed: "bg-accent/30 text-accent-foreground",
  scheduled: "bg-success/15 text-success",
  in_progress: "bg-accent/30 text-accent-foreground",
  waiting_on_permit: "bg-accent/30 text-accent-foreground",
  waiting_on_inspection: "bg-accent/30 text-accent-foreground",
  ready_for_inspection: "bg-accent/30 text-accent-foreground",
  inspection_passed: "bg-success/15 text-success",
  final_needed: "bg-accent/30 text-accent-foreground",
  completed: "bg-primary text-primary-foreground",
  paid: "bg-success text-success-foreground",
  review_requested: "bg-secondary/15 text-secondary",
  archived: "bg-muted text-muted-foreground",
  lost_lead: "bg-muted text-muted-foreground",
};

export const PIPELINE_COLUMNS: { id: string; title: string }[] = [
  { id: "new_lead", title: "New Lead" },
  { id: "contacted", title: "Need to Reply" },
  { id: "estimate_scheduled", title: "Estimate Scheduled" },
  { id: "estimate_sent", title: "Estimate Sent" },
  { id: "approved", title: "Approved" },
  { id: "down_payment_needed", title: "Deposit Needed" },
  { id: "scheduled", title: "Scheduled" },
  { id: "in_progress", title: "In Progress" },
  { id: "waiting_on_inspection", title: "Waiting on Inspection" },
  { id: "completed", title: "Completed" },
  { id: "paid", title: "Paid" },
  { id: "review_requested", title: "Review Requested" },
];

export const PORTFOLIO_CATEGORY_LABELS: Record<string, string> = {
  new_construction: "New Construction",
  panel_upgrades: "Panel Upgrades",
  service_changes: "Service Changes",
  lighting: "Lighting",
  outlets_gfci: "Outlets / GFCI",
  troubleshooting: "Troubleshooting",
  remodel_wiring: "Remodel Wiring",
  commercial: "Commercial",
  contractor_support: "Contractor Support",
  inspection_ready: "Inspection-Ready Work",
};
