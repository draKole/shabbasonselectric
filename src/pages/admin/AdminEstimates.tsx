import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, MessageSquare } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export default function AdminEstimates() {
  const [v, setV] = useState({ name: "", address: "", scope: "", total: "", deposit: "", materials: "Included" });
  const [phone, setPhone] = useState("");

  const text = `SCOPE OF WORK — ELECTRICAL

Customer: ${v.name}
Address: ${v.address}

Work Includes:
${v.scope.split("\n").map((l) => l.trim() ? `* ${l.trim()}` : "").filter(Boolean).join("\n")}

Materials: ${v.materials}
Total: $${v.total || "0"}
Deposit Required: $${v.deposit || "0"}
Balance Due Upon Completion: $${(Number(v.total || 0) - Number(v.deposit || 0)).toFixed(0)}

${BUSINESS.name}
${BUSINESS.phone}`;

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h1 className="text-xl font-extrabold">Estimate Builder</h1>
        <div><Label>Customer Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
        <div><Label>Scope (one line per item)</Label><Textarea rows={6} value={v.scope} onChange={(e) => setV({ ...v, scope: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Total ($)</Label><Input type="number" value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} /></div>
          <div><Label>Deposit ($)</Label><Input type="number" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value })} /></div>
        </div>
        <div><Label>Materials</Label><Input value={v.materials} onChange={(e) => setV({ ...v, materials: e.target.value })} placeholder="Included / Provided by customer" /></div>
        <div><Label>Customer phone (for SMS)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+16145551234" /></div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">Preview</h2>
        <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">{text}</pre>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }} className="gap-1"><Copy className="h-4 w-4" />Copy Text</Button>
          {phone && (
            <a href={`sms:${phone}?&body=${encodeURIComponent(text)}`}>
              <Button variant="outline" className="gap-1"><MessageSquare className="h-4 w-4" />Send by SMS</Button>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
