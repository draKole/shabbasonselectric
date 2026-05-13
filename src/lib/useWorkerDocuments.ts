import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const WORKER_DOC_KEYS: { key: string; label: string }[] = [
  { key: "w4", label: "W-4 received" },
  { key: "i9", label: "I-9 received" },
  { key: "insurance", label: "Insurance added" },
  { key: "wc", label: "Workers comp checked" },
  { key: "ppe", label: "Shirt / PPE issued" },
  { key: "tools", label: "Tools issued" },
  { key: "rate", label: "Pay rate confirmed" },
  { key: "emergency_contact", label: "Emergency contact received" },
];

export type WorkerDoc = { id: string; worker_id: string; doc_key: string; received: boolean; received_on: string | null; notes: string | null };

export function useWorkerDocuments(workerId: string | null | undefined) {
  const [docs, setDocs] = useState<WorkerDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workerId) { setDocs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any).from("worker_documents").select("*").eq("worker_id", workerId);
    setDocs((data as any) || []);
    setLoading(false);
  }, [workerId]);

  useEffect(() => { reload(); }, [reload]);

  async function setReceived(doc_key: string, received: boolean) {
    if (!workerId) return;
    const existing = docs.find(d => d.doc_key === doc_key);
    if (existing) {
      await (supabase as any).from("worker_documents").update({
        received, received_on: received ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", existing.id);
    } else {
      await (supabase as any).from("worker_documents").insert({
        worker_id: workerId, doc_key, received,
        received_on: received ? new Date().toISOString().slice(0, 10) : null,
      });
    }
    reload();
  }

  return { docs, loading, reload, setReceived };
}

export async function seedWorkerDocs(workerId: string) {
  const rows = WORKER_DOC_KEYS.map(d => ({ worker_id: workerId, doc_key: d.key, received: false }));
  await (supabase as any).from("worker_documents").upsert(rows, { onConflict: "worker_id,doc_key" });
}
