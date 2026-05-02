import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSeo } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export default function AdminAuth() {
  useSeo({ title: `Admin Login | ${BUSINESS.name}` });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user && isAdmin) return <Navigate to="/admin" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. If email confirmation is required, check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/admin");
      }
    } catch (e: any) {
      toast.error(e.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-tight py-16">
      <Card className="max-w-md mx-auto p-8">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-center mt-4">
          {mode === "signin" ? "Admin Login" : "Create Admin Account"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {BUSINESS.name} dashboard access
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm text-muted-foreground mt-4 w-full hover:text-secondary"
        >
          {mode === "signin" ? "Need to create an admin account?" : "Already have an account? Sign in"}
        </button>

        {user && !isAdmin && (
          <div className="mt-4 p-3 rounded-md bg-accent/20 text-sm">
            You're signed in but don't have admin access yet. Once your first admin role is assigned, you'll be able to use the dashboard.
          </div>
        )}
      </Card>
    </section>
  );
}
