import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadFollowUpItem {
  type: "stale_new_lead" | "stale_site_visit" | "cold_estimate" | "past_due_follow_up" | "unpaid_completed_job";
  id: string;
  label: string;
  customer_name: string;
  phone?: string;
  service?: string;
  days_since: number;
  message: string;
  link: string;
}

const STALE_DAYS = {
  stale_new_lead: 2,
  stale_site_visit: 3,
  cold_estimate: 5,
  past_due_follow_up: 0,
  unpaid_completed_job: 3,
};

const SECTION_LABELS: Record<string, string> = {
  stale_new_lead: "Stale New Leads",
  stale_site_visit: "Stale Site Visits",
  cold_estimate: "Cold Estimates",
  past_due_follow_up: "Past-Due Follow-Ups",
  unpaid_completed_job: "Unpaid Completed Jobs",
};

const TYPE_ORDER: (keyof typeof SECTION_LABELS)[] = [
  "stale_new_lead",
  "stale_site_visit",
  "cold_estimate",
  "past_due_follow_up",
  "unpaid_completed_job",
];

export function getSectionLabel(type: string): string {
  return SECTION_LABELS[type] || type;
}

export function getTypeOrder(): (keyof typeof SECTION_LABELS)[] {
  return TYPE_ORDER;
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / 86400_000);
}

export function useLeadFollowUps() {
  const [items, setItems] = useState<LeadFollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results: LeadFollowUpItem[] = [];

      // TypeScript-computed cutoff timestamps (no SQL intervals)
      const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString();
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400_000).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      // 1. Stale new leads — created > 2 days, still new_lead
      const { data: staleNewLeads } = await supabase
        .from("leads")
        .select("id, name, phone, service_requested, created_at")
        .eq("status", "new_lead")
        .lt("created_at", twoDaysAgo);
      for (const lead of staleNewLeads || []) {
        const ds = daysAgo(lead.created_at);
        results.push({
          type: "stale_new_lead",
          id: lead.id,
          label: "New lead not contacted",
          customer_name: lead.name,
          phone: lead.phone,
          service: lead.service_requested,
          days_since: ds,
          message: `Hi ${lead.name}, thanks for reaching out to Shabba & Sons Electric. I'm sorry I missed your message — are you still needing electrical work done?`,
          link: `/admin/leads/${lead.id}`,
        });
      }

      // 2. Stale site visits — updated > 3 days, still site_visit_needed
      const { data: staleSiteVisits } = await supabase
        .from("leads")
        .select("id, name, phone, service_requested, updated_at")
        .eq("status", "site_visit_needed")
        .lt("updated_at", threeDaysAgo);
      for (const lead of staleSiteVisits || []) {
        const ds = daysAgo(lead.updated_at);
        results.push({
          type: "stale_site_visit",
          id: lead.id,
          label: "Site visit not scheduled",
          customer_name: lead.name,
          phone: lead.phone,
          service: lead.service_requested,
          days_since: ds,
          message: `Hi ${lead.name}, just following up on your request for electrical work. Are you still needing a site visit to get an estimate?`,
          link: `/admin/leads/${lead.id}`,
        });
      }

      // 3. Cold estimates — updated > 5 days, still estimate_sent
      const { data: coldEstimates } = await supabase
        .from("leads")
        .select("id, name, phone, service_requested, updated_at")
        .eq("status", "estimate_sent")
        .lt("updated_at", fiveDaysAgo);
      for (const lead of coldEstimates || []) {
        const ds = daysAgo(lead.updated_at);
        results.push({
          type: "cold_estimate",
          id: lead.id,
          label: "Estimate sent, no response",
          customer_name: lead.name,
          phone: lead.phone,
          service: lead.service_requested,
          days_since: ds,
          message: `Hi ${lead.name}, just checking in on the estimate I sent last week for ${lead.service_requested || "your electrical work"}. Any questions or would you like to move forward? Happy to adjust the scope if needed.`,
          link: `/admin/leads/${lead.id}`,
        });
      }

      // 4. Past-due follow-ups — next_follow_up <= today, not in terminal stages
      // Collect IDs already covered by categories 1-3 to avoid dupes
      const coveredLeadIds = new Set(results.map((r) => r.id));
      const { data: pastDueFollowUps } = await supabase
        .from("leads")
        .select("id, name, phone, service_requested, next_follow_up, status")
        .lte("next_follow_up", today)
        .not("status", "in", '("lost","completed","paid","invoice_sent")');
      for (const lead of pastDueFollowUps || []) {
        if (coveredLeadIds.has(lead.id)) continue; // already shown in stale/cold categories
        const ds = lead.next_follow_up
          ? Math.max(0, Math.floor((Date.now() - new Date(lead.next_follow_up).getTime()) / 86400_000))
          : 0;
        results.push({
          type: "past_due_follow_up",
          id: lead.id,
          label: "Follow-up overdue",
          customer_name: lead.name,
          phone: lead.phone,
          service: lead.service_requested,
          days_since: ds,
          message: `Hi ${lead.name}, just checking in — wanted to see if you're still thinking about the electrical work. Happy to answer any questions!`,
          link: `/admin/leads/${lead.id}`,
        });
      }

      // 5. Unpaid completed jobs — status completed, not paid, updated > 3 days
      const { data: unpaidJobs } = await supabase
        .from("jobs")
        .select("id, job_type, balance_due, updated_at, customers(name, phone)")
        .eq("status", "completed")
        .neq("payment_status", "paid")
        .lt("updated_at", threeDaysAgo);
      for (const job of unpaidJobs || []) {
        const ds = daysAgo(job.updated_at);
        const name = job.customers?.name || "Valued Customer";
        const phone = job.customers?.phone;
        results.push({
          type: "unpaid_completed_job",
          id: job.id,
          label: "Completed — payment due",
          customer_name: name,
          phone,
          service: job.job_type,
          days_since: ds,
          message: `Hi ${name}, the work was completed and I just wanted to follow up on the remaining balance of $${Number(job.balance_due || 0).toFixed(0)}. You can Zelle to 614-671-8528. Thanks!`,
          link: `/admin/jobs/${job.id}`,
        });
      }

      // Sort: by type order, then by days_since descending (oldest first)
      results.sort((a, b) => {
        const aIdx = TYPE_ORDER.indexOf(a.type);
        const bIdx = TYPE_ORDER.indexOf(b.type);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return b.days_since - a.days_since;
      });

      setItems(results);
      setLoading(false);
    })();
  }, []);

  return { items, loading, staleCount: items.length };
}