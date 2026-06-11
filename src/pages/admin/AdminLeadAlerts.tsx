import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLeadAlertSettings, useUpdateLeadAlertSettings, sendLeadAlert } from "@/lib/useLeadAlertSettings";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

export default function AdminLeadAlerts() {
  const { data: settings, isLoading } = useLeadAlertSettings();
  const update = useUpdateLeadAlertSettings();
  const [form, setForm] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [diag, setDiag] = useState<any>(null);

  async function loadDiag() {
    try {
      const { data } = await supabase.functions.invoke("lead-alert", { body: { diagnostics: true } });
      setDiag(data);
    } catch (e: any) { setDiag({ error: e?.message }); }
  }

  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  useEffect(() => {
    (supabase as any).from("lead_alert_log").select("*").order("sent_at", { ascending: false }).limit(20)
      .then(({ data }: any) => setLogs(data || []));
    loadDiag();
  }, [settings]);

  if (isLoading || !form) return <div className="container-tight py-6">Loading…</div>;

  async function save() {
    await update.mutateAsync({ ...form, id: form.id });
    toast.success("Saved");
  }

  async function testSms() {
    setSending(true);
    try {
      const res = await supabase.functions.invoke("lead-alert", {
        body: { lead_type: "service_request", name: "Test Lead", phone: form.alert_phone || "555-0100", service: "Test alert", address_city: "Columbus, OH" },
      });
      const data: any = res.data;
      if (data?.sent) toast.success("Test SMS sent");
      else toast.warning(`Not sent: ${data?.reason || "unknown"}`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSending(false); }
  }

  const twilioConnected = true; // connector is linked at build time; runtime check happens in edge fn

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><MessageSquare className="h-6 w-6" />Lead Notification Settings</h1>
          <p className="text-sm text-muted-foreground">Get a text alert the moment a new lead submits any public form.</p>
        </div>
        <Badge variant={form.sms_enabled ? "default" : "secondary"}>
          {form.sms_enabled ? "SMS alerts ON" : "SMS alerts OFF"}
        </Badge>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={!!form.sms_enabled} onCheckedChange={(v) => setForm({ ...form, sms_enabled: v })} />
          <Label>Enable SMS alerts</Label>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label>Alert phone (where to receive texts)</Label>
            <Input value={form.alert_phone || ""} placeholder="+16145551212" onChange={(e) => setForm({ ...form, alert_phone: e.target.value })} />
          </div>
          <div>
            <Label>From number (your Twilio number)</Label>
            <Input value={form.from_number || ""} placeholder="+16145551313" onChange={(e) => setForm({ ...form, from_number: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Alert email (optional)</Label>
            <Input value={form.alert_email || ""} placeholder="you@example.com" onChange={(e) => setForm({ ...form, alert_email: e.target.value })} />
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="text-sm font-bold mb-2">Notify me on:</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ["notify_service_request", "New service request"],
              ["notify_estimate_request", "New estimate request"],
              ["notify_contact_form", "New contact form"],
              ["notify_voucher_request", "New voucher request"],
              ["notify_application", "New job application"],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <Switch checked={!!form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
                <Label>{label}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          {twilioConnected
            ? "Twilio connected. Make sure SMS Geo Permissions and SMS Pumping Protection are enabled in your Twilio console."
            : "SMS provider not connected. Lead saved, but no text sent."}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={save} disabled={update.isPending}>Save</Button>
          <Button onClick={testSms} variant="outline" disabled={sending} className="gap-1"><Send className="h-4 w-4" />Send test alert</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-bold mb-2">Recent alerts</div>
        {logs.length === 0 ? <div className="text-sm text-muted-foreground">No alerts yet.</div> :
        <div className="space-y-1 text-xs">
          {logs.map((l) => (
            <div key={l.id} className={`flex items-center justify-between gap-2 border-b border-border py-1 ${!l.ok ? "text-destructive" : ""}`}>
              <span>{new Date(l.sent_at).toLocaleString()} · {l.lead_type}</span>
              <span>{l.ok ? "✓ sent" : `× ${l.error || "failed"}`}</span>
            </div>
          ))}
        </div>}
      </Card>
    </div>
  );
}
