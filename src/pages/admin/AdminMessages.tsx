import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SMS_TEMPLATES } from "@/lib/smsTemplates";
import { Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AdminMessages() {
  const [tplId, setTplId] = useState(SMS_TEMPLATES[0].id);
  const [phone, setPhone] = useState("");
  const [v, setV] = useState({ customerName: "", date: "", time: "", amount: "", address: "", reviewUrl: "" });
  const [override, setOverride] = useState("");

  const tpl = SMS_TEMPLATES.find((t) => t.id === tplId)!;
  const body = useMemo(() => override.trim() || tpl.body(v), [tpl, v, override]);
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h1 className="text-xl font-extrabold">Quick Text Messages</h1>
        <p className="text-sm text-muted-foreground">
          Pick a template, fill in details, and send from your phone's Messages app.
        </p>
        <div>
          <Label>Template</Label>
          <Select value={tplId} onValueChange={(x) => { setTplId(x); setOverride(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SMS_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Customer Name</Label><Input value={v.customerName} onChange={(e) => setV({ ...v, customerName: e.target.value })} /></div>
          <div><Label>Phone (to)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+16145551234" /></div>
          <div><Label>Date</Label><Input value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} placeholder="Tue 5/12" /></div>
          <div><Label>Time</Label><Input value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} placeholder="10am" /></div>
          <div><Label>Amount ($)</Label><Input value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Preview / Edit</h2>
        <Textarea rows={10} value={body} onChange={(e) => setOverride(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { navigator.clipboard.writeText(body); toast.success("Copied"); }} className="gap-1">
            <Copy className="h-4 w-4" /> Copy
          </Button>
          {cleanPhone ? (
            <a href={`sms:${cleanPhone}?&body=${encodeURIComponent(body)}`}>
              <Button className="bg-success text-success-foreground hover:bg-success/90 gap-1">
                <MessageSquare className="h-4 w-4" /> Open in Messages
              </Button>
            </a>
          ) : (
            <a href={`sms:?&body=${encodeURIComponent(body)}`}>
              <Button variant="outline" className="gap-1">
                <MessageSquare className="h-4 w-4" /> Open Messages (no recipient)
              </Button>
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Messages send from your phone's number — your customer never sees the website.
        </p>
      </Card>
    </div>
  );
}
