import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Printer, Ticket, X, Copy, Trash2 } from "lucide-react";
import { useVouchers, makeVoucherCode, type ServiceVoucher } from "@/lib/useVouchers";
import { useGlobalSettings } from "@/lib/useGlobalSettings";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }); }

export default function AdminVouchers() {
  const { settings } = useGlobalSettings();
  const { offers, vouchers, redemptions, reload, totals } = useVouchers();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<ServiceVoucher | null>(null);
  const [applying, setApplying] = useState<ServiceVoucher | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any).from("voucher_requests").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }: any) => setRequests(data || []));
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return vouchers;
    if (statusFilter === "expiring") {
      const cut = new Date(); cut.setDate(cut.getDate() + 30);
      const cs = cut.toISOString().slice(0, 10);
      return vouchers.filter(v => v.expires_on && v.expires_on <= cs && (v.status === "active" || v.status === "partial"));
    }
    return vouchers.filter(v => v.status === statusFilter);
  }, [vouchers, statusFilter]);

  const t = totals();

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Ticket className="h-6 w-6" /> Vouchers</h1>
          <p className="text-xs text-muted-foreground">Prepaid Service Voucher / Electrical Service Credit — customer prepayment for future labor.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingOffer(null); setShowOfferDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Offer</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Sell Voucher</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Voucher cash collected (all-time)" value={fmt(t.cashCollected)} />
        <Stat label="Credit value sold" value={fmt(t.creditSold)} />
        <Stat label="Credit redeemed (all-time)" value={fmt(redemptions.reduce((s, r) => s + Number(r.amount_applied || 0), 0))} />
        <Stat label="Outstanding voucher liability" value={fmt(t.outstandingLiability)} highlight />
      </div>

      <Tabs defaultValue="vouchers">
        <TabsList>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.filter(r => r.status === "new").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="space-y-3">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs">Filter:</Label>
              {["all", "active", "partial", "redeemed", "void", "refunded", "expiring"].map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>{s}</Button>
              ))}
            </div>
          </Card>

          <Card className="p-3 divide-y divide-border">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground p-3">No vouchers.</p>}
            {filtered.map(v => {
              const remain = Math.max(0, Number(v.credit_value) - Number(v.credit_used));
              const hasRedemptions = redemptions.some(r => r.voucher_id === v.id);
              async function setStatus(status: string, confirmMsg: string) {
                if (!confirm(confirmMsg)) return;
                const { error } = await (supabase as any).from("service_vouchers").update({ status }).eq("id", v.id);
                if (error) return toast.error(error.message);
                toast.success(`Voucher ${status}`);
                reload();
              }
              async function hardDelete() {
                if (hasRedemptions) { toast.error("Has redemptions — void or refund instead."); return; }
                if (!confirm("Permanently delete this voucher? This cannot be undone.")) return;
                const { error } = await (supabase as any).from("service_vouchers").delete().eq("id", v.id);
                if (error) return toast.error(error.message);
                toast.success("Voucher deleted");
                reload();
              }
              const canHardDelete = !hasRedemptions && (v.status === "active");
              return (
                <div key={v.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{v.customer_name_snapshot || "—"} <span className="text-xs text-muted-foreground font-mono">{v.code}</span></div>
                    <div className="text-xs text-muted-foreground">Paid {fmt(v.amount_paid)} → Credit {fmt(v.credit_value)} · Used {fmt(v.credit_used)} · Remaining <b>{fmt(remain)}</b> · {v.purchase_date}{v.expires_on ? ` · expires ${v.expires_on}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${v.status === "active" ? "bg-success/15 text-success" : v.status === "partial" ? "bg-secondary/15 text-secondary" : "bg-muted"}`}>{v.status}</span>
                    <Button size="sm" variant="ghost" onClick={() => setViewing(v)}>View</Button>
                    {(v.status === "active" || v.status === "partial") && <Button size="sm" variant="outline" onClick={() => setApplying(v)}>Apply</Button>}
                    {(v.status === "active" || v.status === "partial") && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setStatus("void", "Void this voucher? It will no longer count as liability.")}>Void</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus("cancelled", "Cancel this voucher?")}>Cancel</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus("refunded", "Mark as refunded? Make sure you actually returned the money.")}>Refund</Button>
                      </>
                    )}
                    {canHardDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={hardDelete}>Delete</Button>}
                  </div>
                </div>
              );
            })}
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-2">
          <Card className="p-3 divide-y divide-border">
            {offers.map(o => (
              <div key={o.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-xs text-muted-foreground">Pay {fmt(o.amount_paid)} → Credit {fmt(o.credit_value)} · Bonus {fmt(o.bonus)} · {o.labor_only ? "Labor only" : "Includes materials"} · {o.active ? "Active" : "Inactive"}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setEditingOffer(o); setShowOfferDialog(true); }}>Edit</Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-2">
          <Card className="p-3 divide-y divide-border">
            {requests.length === 0 && <p className="text-sm text-muted-foreground">No voucher requests.</p>}
            {requests.map(r => {
              const offer = offers.find(o => o.id === r.offer_id);
              return (
                <div key={r.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.customer_name} <span className="text-xs text-muted-foreground">{r.phone}{r.email ? ` · ${r.email}` : ""}</span></div>
                    <div className="text-xs text-muted-foreground">{offer?.name || "—"} · {new Date(r.created_at).toLocaleString()}{r.notes ? ` · ${r.notes}` : ""}</div>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{r.status}</span>
                    {r.status === "new" && <Button size="sm" variant="outline" onClick={async () => {
                      await (supabase as any).from("voucher_requests").update({ status: "processed" }).eq("id", r.id);
                      setRequests(rs => rs.map(x => x.id === r.id ? { ...x, status: "processed" } : x));
                    }}>Mark processed</Button>}
                  </div>
                </div>
              );
            })}
          </Card>
        </TabsContent>
      </Tabs>

      {showOfferDialog && <OfferDialog offer={editingOffer} defaultTerms={settings.voucher_default_terms} onClose={() => { setShowOfferDialog(false); reload(); }} />}
      {showCreate && <CreateVoucherDialog offers={offers} defaultTerms={settings.voucher_default_terms} onClose={() => { setShowCreate(false); reload(); }} />}
      {viewing && <VoucherCertificate voucher={viewing} settings={settings} onClose={() => setViewing(null)} />}
      {applying && <ApplyVoucherDialog voucher={applying} onClose={() => { setApplying(null); reload(); }} />}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "bg-secondary/5 border-secondary/40" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-secondary" : ""}`}>{value}</div>
    </Card>
  );
}

function OfferDialog({ offer, defaultTerms, onClose }: any) {
  const [f, setF] = useState({
    name: offer?.name || "", amount_paid: String(offer?.amount_paid ?? 0), credit_value: String(offer?.credit_value ?? 0),
    bonus: String(offer?.bonus ?? 0), labor_only: offer?.labor_only ?? true, materials_included: offer?.materials_included ?? false,
    min_job_size: String(offer?.min_job_size ?? ""), max_per_job: String(offer?.max_per_job ?? ""),
    active: offer?.active ?? true, terms: offer?.terms ?? defaultTerms, display_order: String(offer?.display_order ?? 0),
  });
  async function save() {
    const payload: any = {
      name: f.name, amount_paid: Number(f.amount_paid), credit_value: Number(f.credit_value), bonus: Number(f.bonus),
      labor_only: f.labor_only, materials_included: f.materials_included,
      min_job_size: f.min_job_size ? Number(f.min_job_size) : null,
      max_per_job: f.max_per_job ? Number(f.max_per_job) : null,
      active: f.active, terms: f.terms, display_order: Number(f.display_order) || 0,
    };
    const q = offer
      ? (supabase as any).from("voucher_offers").update(payload).eq("id", offer.id)
      : (supabase as any).from("voucher_offers").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved"); onClose();
  }
  async function del() {
    if (!offer || !confirm("Delete offer?")) return;
    await (supabase as any).from("voucher_offers").delete().eq("id", offer.id);
    onClose();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{offer ? "Edit" : "New"} voucher offer</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div><Label>Name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Pays</Label><Input type="number" value={f.amount_paid} onChange={e => setF({ ...f, amount_paid: e.target.value })} /></div>
            <div><Label>Credit</Label><Input type="number" value={f.credit_value} onChange={e => setF({ ...f, credit_value: e.target.value })} /></div>
            <div><Label>Bonus</Label><Input type="number" value={f.bonus} onChange={e => setF({ ...f, bonus: e.target.value })} /></div>
            <div><Label>Min job</Label><Input type="number" value={f.min_job_size} onChange={e => setF({ ...f, min_job_size: e.target.value })} /></div>
            <div><Label>Max/job</Label><Input type="number" value={f.max_per_job} onChange={e => setF({ ...f, max_per_job: e.target.value })} /></div>
            <div><Label>Order</Label><Input type="number" value={f.display_order} onChange={e => setF({ ...f, display_order: e.target.value })} /></div>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.labor_only} onCheckedChange={c => setF({ ...f, labor_only: c })} /> Labor only</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.materials_included} onCheckedChange={c => setF({ ...f, materials_included: c })} /> Includes materials</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={c => setF({ ...f, active: c })} /> Active</label>
          </div>
          <div><Label>Terms</Label><Textarea rows={4} value={f.terms} onChange={e => setF({ ...f, terms: e.target.value })} /></div>
          <div className="flex gap-2 justify-end">
            {offer && <Button variant="ghost" onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateVoucherDialog({ offers, defaultTerms, onClose }: any) {
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [offerId, setOfferId] = useState(offers[0]?.id || "");
  const [amountPaid, setAmountPaid] = useState("0");
  const [creditValue, setCreditValue] = useState("0");
  const [method, setMethod] = useState("cash");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const offer = offers.find((o: any) => o.id === offerId);

  useEffect(() => { supabase.from("customers").select("id, name, phone, email").order("name").then(({ data }) => setCustomers(data || [])); }, []);
  useEffect(() => { if (offer) { setAmountPaid(String(offer.amount_paid)); setCreditValue(String(offer.credit_value)); } }, [offerId]);

  async function save() {
    if (!name && !customerId) return toast.error("Pick customer or enter name");
    const code = makeVoucherCode();
    const cust = customers.find(c => c.id === customerId);
    const payload: any = {
      code, customer_id: customerId || null,
      customer_name_snapshot: cust?.name || name,
      customer_phone: cust?.phone || phone || null,
      customer_email: cust?.email || email || null,
      offer_id: offerId || null,
      amount_paid: Number(amountPaid), credit_value: Number(creditValue),
      credit_used: 0, purchase_date: purchaseDate,
      expires_on: expiresOn || null, status: "active",
      payment_method: method,
      labor_only: offer?.labor_only ?? true,
      materials_included: offer?.materials_included ?? false,
      terms: offer?.terms || defaultTerms,
      notes: notes || null,
    };
    const { error } = await (supabase as any).from("service_vouchers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Voucher created · " + code); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Sell prepaid voucher</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div><Label>Customer</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">— Or enter manually below —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!customerId && (
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}
          <div><Label>Offer</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={offerId} onChange={e => setOfferId(e.target.value)}>
              {offers.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Amount paid</Label><Input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} /></div>
            <div><Label>Credit value</Label><Input type="number" value={creditValue} onChange={e => setCreditValue(e.target.value)} /></div>
            <div><Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash","check","card","zelle","venmo","cashapp","other"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Purchase date</Label><Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
            <div className="col-span-2"><Label>Expires on (optional)</Label><Input type="date" value={expiresOn} onChange={e => setExpiresOn(e.target.value)} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Create Voucher</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApplyVoucherDialog({ voucher, onClose }: { voucher: ServiceVoucher; onClose: () => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobId, setJobId] = useState("");
  const remaining = Math.max(0, Number(voucher.credit_value) - Number(voucher.credit_used));
  const [amount, setAmount] = useState(String(remaining));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let q = supabase.from("jobs").select("id, address, customer_id, customers(name)").eq("archived", false).order("created_at", { ascending: false }).limit(100);
    if (voucher.customer_id) q = q.eq("customer_id", voucher.customer_id);
    q.then(({ data }) => setJobs(data || []));
  }, [voucher.customer_id]);

  async function apply() {
    const amt = Number(amount);
    if (amt <= 0 || amt > remaining) return toast.error("Invalid amount");
    if (!jobId) return toast.error("Pick a job");
    const { error: rErr } = await (supabase as any).from("voucher_redemptions").insert({
      voucher_id: voucher.id, job_id: jobId, amount_applied: amt, notes: notes || null,
    });
    if (rErr) return toast.error(rErr.message);
    const newUsed = Number(voucher.credit_used) + amt;
    const newStatus = newUsed >= Number(voucher.credit_value) ? "redeemed" : "partial";
    await (supabase as any).from("service_vouchers").update({ credit_used: newUsed, status: newStatus }).eq("id", voucher.id);
    toast.success("Voucher applied. Adjust job balance manually if needed.");
    onClose();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Apply voucher {voucher.code}</DialogTitle></DialogHeader>
        <div className="text-sm space-y-2">
          <p>Customer: <b>{voucher.customer_name_snapshot}</b></p>
          <p>Remaining credit: <b>{fmt(remaining)}</b></p>
          <div><Label>Job</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={jobId} onChange={e => setJobId(e.target.value)}>
              <option value="">Pick job…</option>
              {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.customers?.name || "—"} · {j.address || j.id.slice(0, 6)}</option>)}
            </select>
          </div>
          <div><Label>Amount to apply</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Labor-only unless voucher explicitly includes materials. This records the redemption; update the job's balance/labor line as needed.</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={apply}>Apply</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VoucherCertificate({ voucher, settings, onClose }: { voucher: ServiceVoucher; settings: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-auto print:bg-transparent print:p-0" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-lg shadow-xl p-6 print:shadow-none print:rounded-none" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4 print:hidden">
          <h3 className="font-bold">Voucher Certificate</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(voucher.code); toast.success("Code copied"); }}><Copy className="h-3.5 w-3.5 mr-1" />Code</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="border-b-2 border-foreground pb-3 mb-4">
          <div className="text-2xl font-extrabold tracking-tight">{settings.business_name || "Shabba & Sons Electric"}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-secondary">Prepaid Service Voucher · Electrical Service Credit</div>
          <div className="text-xs text-muted-foreground mt-1">{settings.business_phone || "614-671-8528"}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-muted-foreground">Voucher #</span><br /><b className="font-mono">{voucher.code}</b></div>
          <div><span className="text-muted-foreground">Issued</span><br /><b>{voucher.purchase_date}</b></div>
          <div><span className="text-muted-foreground">Customer</span><br /><b>{voucher.customer_name_snapshot || "—"}</b></div>
          <div><span className="text-muted-foreground">Expires</span><br /><b>{voucher.expires_on || "No expiration"}</b></div>
        </div>
        <div className="rounded-md bg-success/10 border border-success/40 p-4 mb-4 text-center">
          <div className="text-xs text-muted-foreground uppercase">Labor Credit Value</div>
          <div className="text-4xl font-extrabold text-success">{fmt(voucher.credit_value)}</div>
          <div className="text-xs text-muted-foreground mt-1">Paid {fmt(voucher.amount_paid)} · Used {fmt(voucher.credit_used)} · Remaining {fmt(Math.max(0, voucher.credit_value - voucher.credit_used))}</div>
        </div>
        <div className="text-xs whitespace-pre-wrap border-t pt-3 text-muted-foreground">{voucher.terms || settings.voucher_default_terms}</div>
        <p className="text-[10px] text-muted-foreground mt-3 italic">Schedule by calling {settings.business_phone || "614-671-8528"} at least {settings.voucher_min_schedule_days || 7} days in advance.</p>
      </div>
    </div>
  );
}
