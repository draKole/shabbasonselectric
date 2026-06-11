import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/useLiveCash";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

type Props = {
  accountType: "business" | "personal";
  currentBalance?: number;
  reconciliationDate?: string | null;
  onDone?: () => void;
};

export function CashReconciliationCard({ accountType, currentBalance = 0, reconciliationDate, onDone }: Props) {
  const [balance, setBalance] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("Starting clean after old money was already spent on build/debt.");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setBalance(String(Math.round(currentBalance * 100) / 100)); }, [currentBalance]);

  async function save() {
    setBusy(true);
    const { error } = await (supabase as any).from("cash_reconciliations").insert({
      account_type: accountType,
      account_name: accountType === "business" ? "Business cash" : "Personal cash",
      reconciled_balance: Number(balance) || 0,
      reconciliation_date: date,
      note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${accountType === "business" ? "Business" : "Personal"} live cash reset`);
    onDone?.();
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2"><Wallet className="h-4 w-4" />Cash Reconciliation</h3>
        <span className="text-xs text-muted-foreground">Current: {fmtMoney(currentBalance)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Set the real cash currently on hand. Old jobs, bills, debt, and reports stay in history, but live cash starts from this reset date.
        {reconciliationDate ? ` Last reset: ${reconciliationDate}.` : " Live Cash needs reconciliation."}
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <div><Label>Actual cash balance</Label><Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
        <div><Label>As of date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Correction note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
      <Button onClick={save} disabled={busy}>{busy ? "Saving..." : `Set ${accountType === "business" ? "Business" : "Personal"} Live Cash`}</Button>
    </Card>
  );
}

export function ReconciliationWarning({ show }: { show?: boolean }) {
  if (!show) return null;
  return <Card className="p-3 text-sm border-destructive/40 bg-destructive/5 text-destructive">Live Cash needs reconciliation. Set your actual business/personal cash to begin tracking accurately.</Card>;
}