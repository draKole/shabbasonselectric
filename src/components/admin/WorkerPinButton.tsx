import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Worker = {
  id: string; full_name: string; email?: string | null; phone?: string | null;
  login_pin_hash?: string | null; login_identifier?: string | null;
  login_last_at?: string | null; invite_status?: string | null;
  active?: boolean;
};

function statusLabel(w: Worker) {
  if (!w.active) return "Disabled";
  if (w.login_last_at) return "Active";
  if (w.login_pin_hash) return "PIN created";
  return "No PIN";
}
function statusClass(w: Worker) {
  if (!w.active) return "bg-muted text-muted-foreground";
  if (w.login_last_at) return "bg-success/15 text-success";
  if (w.login_pin_hash) return "bg-secondary/15 text-secondary";
  return "bg-muted text-muted-foreground";
}

export default function WorkerPinButton({ worker, onDone }: { worker: Worker; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ pin: string; identifier: string; portal_url: string } | null>(null);
  const [errOpen, setErrOpen] = useState<string | null>(null);

  async function setPin() {
    if (!worker.email && !worker.phone) {
      setErrOpen("This worker has no email or phone. Add one on the worker record first, then try again.");
      return;
    }
    const verb = worker.login_pin_hash ? "Reset" : "Create";
    if (!confirm(`${verb} login PIN for ${worker.full_name}? Old PIN will stop working.`)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("worker-pin-set", { body: { worker_id: worker.id } });
      if (error) {
        let detail = error.message || "Unknown error";
        try {
          const ctx: any = (error as any).context;
          if (ctx?.response) { const j = await ctx.response.json(); detail = j?.error || detail; }
        } catch {}
        throw new Error(detail);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!(data as any)?.pin) throw new Error("Server returned no PIN. Check edge function logs.");
      setRes(data as any);
      toast.success("PIN created. Copy the details below.");
      onDone();
    } catch (e: any) {
      const msg = e?.message || "Failed to create PIN";
      toast.error(msg);
      setErrOpen(msg);
    } finally { setBusy(false); }
  }


  async function disableLogin() {
    if (!confirm(`Disable login for ${worker.full_name}? Their PIN will be cleared.`)) return;
    const { error } = await supabase.from("workers").update({
      login_pin_hash: null, invite_status: "disabled",
    } as any).eq("id", worker.id);
    if (error) return toast.error(error.message);
    toast.success("Login disabled");
    onDone();
  }

  function copyAll() {
    if (!res) return;
    const txt = `Worker Portal: ${res.portal_url}\nIdentifier: ${res.identifier}\nPIN: ${res.pin}\n\nGo to the portal, enter your phone or email and the 6-digit PIN.`;
    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  }

  const label = statusLabel(worker);
  return (
    <>
      <Button size="sm" variant="outline" disabled={busy} onClick={setPin} className="gap-1" title={`Login: ${label}`}>
        <KeyRound className="h-3.5 w-3.5" />{worker.login_pin_hash ? "Reset PIN" : "Create PIN"}
      </Button>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusClass(worker)}`}>{label}</span>
      {worker.login_pin_hash && worker.active !== false && (
        <Button size="sm" variant="ghost" onClick={disableLogin} className="text-destructive text-xs">Disable</Button>
      )}
      <Dialog open={!!res} onOpenChange={(o) => !o && setRes(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Worker login PIN</DialogTitle></DialogHeader>
          {res && (
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Share with {worker.full_name}. The PIN won't be shown again.</p>
              <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
                <Row label="Portal" value={res.portal_url} />
                <Row label="Worker" value={worker.full_name} />
                <Row label="Identifier" value={res.identifier} />
                <Row label="6-digit PIN" value={res.pin} mono />
              </div>
              <p className="text-xs">Instructions: open the portal, enter the phone or email, then the PIN.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={copyAll}><Copy className="h-3.5 w-3.5 mr-1" />Copy all</Button>
                <Button onClick={() => setRes(null)}>Done</Button>
              </div>
              {worker.login_last_at && (
                <div className="text-[11px] text-muted-foreground">Last login: {new Date(worker.login_last_at).toLocaleString()}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!errOpen} onOpenChange={(o) => !o && setErrOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Couldn't create PIN</DialogTitle></DialogHeader>
          <p className="text-sm text-destructive whitespace-pre-wrap">{errOpen}</p>
          <p className="text-xs text-muted-foreground">If this keeps happening, check the worker-pin-set edge function logs.</p>
          <div className="flex justify-end"><Button onClick={() => setErrOpen(null)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      <span className={`flex-1 truncate ${mono ? "font-mono text-lg font-extrabold" : ""}`}>{value}</span>
      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
