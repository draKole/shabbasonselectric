import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export default function EstimateShare() {
  const { token } = useParams();
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

  const items = Array.isArray(data.line_items) ? data.line_items : [];
  const total = Number(data.total_price || 0);
  const deposit = Number(data.deposit_required || 0);
  const balance = Math.max(total - deposit, 0);

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="bg-card rounded-lg border border-border p-6 sm:p-10 shadow-sm print:shadow-none print:border-0">
          <div className="flex justify-between items-start mb-6 print:hidden">
            <div></div>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>

          <div className="border-b border-border pb-4 mb-6">
            <h1 className="text-3xl font-extrabold">{BUSINESS.name}</h1>
            <p className="text-sm text-muted-foreground">{BUSINESS.serviceArea}</p>
            <p className="text-sm">{BUSINESS.phone} · {BUSINESS.email}</p>
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Prepared for</div>
              <div className="font-bold text-lg">{data.customer?.name || "—"}</div>
              <div className="text-sm text-muted-foreground">
                {[data.customer?.address, data.customer?.city, data.customer?.state].filter(Boolean).join(", ")}
              </div>
              {data.customer?.phone && <div className="text-sm">{data.customer.phone}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground">Estimate</div>
              <div className="text-sm">{new Date(data.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <h2 className="font-bold mb-2">Scope of Work</h2>
          {items.length > 0 ? (
            <table className="w-full text-sm border border-border mb-4">
              <thead className="bg-muted">
                <tr><th className="text-left p-2">Description</th><th className="text-right p-2 w-24">Qty</th><th className="text-right p-2 w-28">Price</th></tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">{it.description}</td>
                    <td className="p-2 text-right">{it.qty || 1}</td>
                    <td className="p-2 text-right">${Number(it.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded mb-4 font-sans">{data.scope || ""}</pre>
          )}

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              <Row label="Materials" value={data.materials_included ? "Included" : "Not included"} />
              <Row label="Total" value={`$${total.toFixed(2)}`} bold />
              <Row label="Deposit required" value={`$${deposit.toFixed(2)}`} />
              <Row label="Balance on completion" value={`$${balance.toFixed(2)}`} bold />
            </div>
          </div>

          {data.terms && (
            <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
              <div className="font-semibold text-foreground mb-1">Terms</div>
              <div className="whitespace-pre-wrap">{data.terms}</div>
            </div>
          )}

          <div className="mt-8 print:hidden text-center">
            <a href={`tel:+${BUSINESS.phoneDigits}`}>
              <Button className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                <Phone className="h-4 w-4" /> Call to approve: {BUSINESS.phone}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border py-1 ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
