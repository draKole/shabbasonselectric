import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Phone } from "lucide-react";
import { useGlobalSettings, isYes, num } from "@/lib/useGlobalSettings";

type Item = {
  title?: string;
  description?: string;
  qty?: number;
  // legacy: price; new: unit_price + discount + final_unit_price
  price?: number;
  unit_price?: number;
  discount?: number;
  final_unit_price?: number;
  materials_included?: boolean;
  customer_supplied?: string;
};

function lineNums(it: Item) {
  const qty = Number(it.qty || 1);
  const unit = Number(it.unit_price ?? it.price ?? 0);
  const final = it.final_unit_price != null ? Number(it.final_unit_price) : Math.max(unit - Number(it.discount || 0), 0);
  return { qty, unit, final, originalLine: qty * unit, finalLine: qty * final, discountLine: qty * (unit - final) };
}

export default function EstimateShare() {
  const { token } = useParams();
  const { settings } = useGlobalSettings();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: res, error } = await supabase.rpc("get_estimate_by_token", { _token: token });
      if (error) { setErr(error.message); return; }
      if (!res) { setErr("Estimate not found"); return; }
      setData(res);
    })();
  }, [token]);

  if (err) return <div className="container-tight py-12 text-center text-muted-foreground">{err}</div>;
  if (!data) return <div className="container-tight py-12 text-center">Loading…</div>;

  const items: Item[] = Array.isArray(data.line_items) ? data.line_items : [];
  const sums = items.map(lineNums);
  const originalSubtotal = sums.reduce((s, x) => s + x.originalLine, 0);
  const finalSubtotal = sums.reduce((s, x) => s + x.finalLine, 0);
  const totalDiscount = originalSubtotal - finalSubtotal;
  const total = Number(data.total_price || finalSubtotal || 0);
  const deposit = Number(data.deposit_required || 0);
  const balance = Math.max(total - deposit, 0);
  const showOriginal = isYes(settings.estimate_show_original);
  const showDiscount = isYes(settings.estimate_show_discount) && totalDiscount > 0;
  const showFinal = isYes(settings.estimate_show_final);
  const showMaterials = isYes(settings.estimate_show_materials_note);
  const validDays = num(settings.estimate_valid_days, 30);
  const discountLabel = settings.estimate_discount_label || "Customer Discount";

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="bg-card rounded-lg border border-border p-6 sm:p-10 shadow-sm print:shadow-none print:border-0">
          <div className="flex justify-end mb-4 print:hidden">
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>

          {/* Header */}
          <div className="border-b-2 border-foreground pb-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">SCOPE OF WORK — ELECTRICAL</h1>
            <p className="text-sm text-muted-foreground mt-1">{settings.business_name || "Shabba & Sons Electric"} · {settings.business_phone || "614-671-8528"}</p>
          </div>

          {/* Customer block */}
          <div className="grid sm:grid-cols-2 gap-2 text-sm mb-5">
            <div>
              <div><b>Customer:</b> {data.customer?.name || "—"}</div>
              {data.customer?.phone && <div><b>Phone:</b> {data.customer.phone}</div>}
            </div>
            <div>
              <div><b>Job Address:</b> {[data.customer?.address, data.customer?.city, data.customer?.state].filter(Boolean).join(", ") || "—"}</div>
              <div><b>Estimate Date:</b> {new Date(data.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Work includes */}
          <h2 className="font-bold text-lg mb-2">Work Includes</h2>
          {items.length > 0 ? (
            <ol className="space-y-4 mb-6">
              {items.map((it, i) => {
                const n = sums[i];
                const desc = (it.description || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                const discounted = n.unit !== n.final && n.unit > 0;
                return (
                  <li key={i}>
                    <div className="font-bold">{i + 1}. {it.title || it.description?.split("\n")[0] || "Service"}</div>
                    {desc.length > 0 && (
                      <ul className="list-disc list-inside text-sm mt-1 space-y-0.5 ml-2">
                        {desc.map((d, j) => <li key={j}>{d}</li>)}
                      </ul>
                    )}
                    <div className="mt-2 text-sm">
                      {showOriginal && <div>Original Price: <b>${n.originalLine.toFixed(2)}</b>{n.qty > 1 ? ` (${n.qty} × $${n.unit.toFixed(2)})` : ""}</div>}
                      {showFinal && discounted && <div className="text-success">Discounted Price: <b>${n.finalLine.toFixed(2)}</b></div>}
                      {!discounted && !showOriginal && <div>Price: <b>${n.finalLine.toFixed(2)}</b></div>}
                      {it.customer_supplied && <div className="text-xs text-muted-foreground italic">Materials: {it.customer_supplied}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <pre className="whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded mb-4 font-sans">{data.scope || ""}</pre>
          )}

          {/* Materials note */}
          {showMaterials && (
            <div className="mb-5 text-sm">
              <div className="font-bold">Materials</div>
              <div>{data.materials_included ? "Wire, breakers, and standard materials included." : "Materials not included."}</div>
            </div>
          )}

          {/* Totals */}
          <div className="border-t-2 border-foreground pt-3 space-y-1 text-sm sm:text-base">
            {showOriginal && totalDiscount > 0 && (
              <Row label="Original Total" value={`$${originalSubtotal.toFixed(2)}`} />
            )}
            {showDiscount && (
              <Row label={discountLabel} value={`-$${totalDiscount.toFixed(2)}`} className="text-success" />
            )}
            <Row label="Final Agreed Total" value={`$${total.toFixed(2)}`} bold />
            <Row label="Deposit Required" value={`$${deposit.toFixed(2)}`} />
            <Row label="Balance Due Upon Completion" value={`$${balance.toFixed(2)}`} bold />
          </div>

          {/* Terms */}
          <div className="mt-6 pt-4 border-t border-border text-sm text-muted-foreground space-y-1">
            <div>Estimate valid for {validDays} days.</div>
            {data.terms && <div className="whitespace-pre-wrap">{data.terms}</div>}
          </div>

          <div className="mt-6 text-sm">
            <div className="font-bold">{settings.business_name || "Shabba & Sons Electric"}</div>
            <div>{settings.business_phone || "614-671-8528"}</div>
            {settings.business_address && <div>{settings.business_address}</div>}
          </div>

          <div className="mt-8 print:hidden text-center">
            <a href={`tel:${(settings.business_phone || "6146718528").replace(/\D/g, "")}`}>
              <Button className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                <Phone className="h-4 w-4" /> Call to approve: {settings.business_phone || "614-671-8528"}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, className = "" }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between border-b border-border py-1 ${bold ? "font-bold text-base sm:text-lg" : ""} ${className}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
