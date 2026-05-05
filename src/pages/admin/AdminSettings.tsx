import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { setAppSetting } from "@/lib/useAppSettings";
import { toast } from "sonner";

export default function AdminSettings() {
  const [google, setGoogle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "google_review_url").maybeSingle()
      .then(({ data }) => setGoogle(data?.value || ""));
  }, []);

  async function save() {
    setBusy(true);
    const { error } = await setAppSetting("google_review_url", google.trim());
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  return (
    <div className="container-tight py-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <Card className="p-5 space-y-3">
        <div>
          <Label>Google Review Link</Label>
          <Input
            value={google}
            onChange={(e) => setGoogle(e.target.value)}
            placeholder="https://g.page/r/.../review"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used everywhere the site shows "Leave a Google Review". Opens in a new tab.
          </p>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
      </Card>
    </div>
  );
}
