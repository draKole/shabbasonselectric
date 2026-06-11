import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WorkerLogin() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/worker/dashboard");
    });
  }, [nav]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !pin) return toast.error("Enter your phone or email and PIN");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("worker-pin-login", { body: { identifier, pin } });
      if (error) {
        let detail = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx?.response) { const j = await ctx.response.json(); detail = j?.error || detail; }
        } catch {}
        throw new Error(detail);
      }
      const r: any = data;
      if (r?.error) throw new Error(r.error);
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: r.email, password: r.password });
      if (sErr) throw sErr;
      toast.success(`Welcome${r.worker_name ? `, ${r.worker_name}` : ""}!`);
      nav("/worker/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-sm">
        <h1 className="text-xl font-extrabold mb-1">Worker Login</h1>
        <p className="text-xs text-muted-foreground mb-4">Shabba & Sons Electric — sign in with your phone or email and 6-digit PIN.</p>
        <form onSubmit={login} className="space-y-3">
          <div><Label>Phone or Email</Label><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder="6145551212 or you@email.com" /></div>
          <div><Label>PIN</Label><Input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(e) => setPin(e.target.value)} required autoComplete="current-password" placeholder="••••••" maxLength={6} /></div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
          <p className="text-xs text-muted-foreground text-center">No PIN? Ask your admin to create one for you.</p>
        </form>
      </Card>
    </div>
  );
}
