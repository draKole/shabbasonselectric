import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Copy, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSetup() {
  const { user } = useAuth();
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedToken, setFeedToken] = useState<string>("");
  const [feedUrl, setFeedUrl] = useState<string>("");

  useEffect(() => {
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin")
      .then(({ count }) => setAdminCount(count ?? 0));
    const t = localStorage.getItem("ssadmin_feed_token") || "";
    setFeedToken(t);
    if (t) updateFeedUrl(t);
  }, []);

  function updateFeedUrl(token: string) {
    const supaUrl = import.meta.env.VITE_SUPABASE_URL;
    setFeedUrl(`${supaUrl}/functions/v1/calendar-feed?token=${encodeURIComponent(token)}`);
  }

  async function claimAdmin() {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("claim_first_admin" as any);
      if (error) throw error;
      toast.success("Admin role assigned. Refreshing...");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  function generateToken() {
    const t = crypto.randomUUID();
    localStorage.setItem("ssadmin_feed_token", t);
    setFeedToken(t);
    updateFeedUrl(t);
    toast.success("Feed token generated. Save it in Cloud Secrets as CALENDAR_FEED_TOKEN.");
  }

  return (
    <div className="container-tight py-6 space-y-6 max-w-3xl">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-8 w-8 text-secondary shrink-0" />
          <div>
            <h2 className="font-bold text-lg">Admin Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as: <strong>{user?.email}</strong>
            </p>
            {adminCount === 0 && (
              <>
                <p className="mt-3 text-sm">
                  No admin exists yet. Click below to claim the first admin role for this account.
                </p>
                <Button onClick={claimAdmin} disabled={busy} className="mt-3">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Claim First Admin
                </Button>
              </>
            )}
            {adminCount !== null && adminCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {adminCount} admin{adminCount > 1 ? "s" : ""} configured. To add another admin, an existing
                admin must insert a row into user_roles for that user.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-8 w-8 text-secondary shrink-0" />
          <div className="flex-1">
            <h2 className="font-bold text-lg">Calendar Feed</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to all your scheduled jobs in Google Calendar or Apple Calendar. Generate a private
              token, then add it as <code className="bg-muted px-1 rounded">CALENDAR_FEED_TOKEN</code> in
              Cloud Secrets so the feed function can validate it.
            </p>

            <div className="mt-4 space-y-3">
              <Button variant="outline" onClick={generateToken}>Generate Feed Token</Button>
              {feedToken && (
                <>
                  <div>
                    <Label>Token (also save in Cloud Secrets)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={feedToken} readOnly />
                      <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(feedToken); toast.success("Copied"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Subscribe URL (paste into Google/Apple Calendar)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={feedUrl} readOnly />
                      <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(feedUrl); toast.success("Copied"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      In Google Calendar: Other calendars → + → From URL. In Apple Calendar: File → New Calendar Subscription.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
