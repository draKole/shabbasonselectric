import { useEffect } from "react";

function _useTitle(t:string){ useEffect(()=>{const o=document.title;document.title=t;return()=>{document.title=o;};},[t]); return null; }
export default function Terms() {
  return (
    <div className="container-tight py-10 prose prose-sm max-w-3xl">
      {(_useTitle as any)("Terms of Service | Shabba & Sons Electric")}
      
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>Using this site</h2>
      <p>You agree to use this website honestly and only for its intended purpose: learning about our services, requesting work, or applying for a job.</p>

      <h2>Estimates and quotes</h2>
      <p>Estimates are based on what you tell us and what we can see in photos. They are not final until we inspect the work in person and you approve it. Prices may change if we find hidden issues, code violations, or if materials change. We will tell you before doing any work that costs more than the estimate.</p>

      <h2>Accurate information</h2>
      <p>You agree to give us accurate photos, addresses, contact info, and job details. If wrong information causes extra trips or rework, additional charges may apply.</p>

      <h2>Payment</h2>
      <p>Deposits may be required to schedule work. Final balances are due when the job is complete unless we agree to other terms in writing. Returned checks and unpaid balances may incur fees.</p>

      <h2>Emergency calls</h2>
      <p>We try to respond to emergencies as quickly as possible but cannot guarantee availability. Emergency calls may be billed at a premium rate.</p>

      <h2>Liability</h2>
      <p>We carry insurance and stand behind our work. Our liability is limited to the value of the job. We are not responsible for losses caused by pre-existing conditions, hidden damage, code violations not disclosed before work began, or weather and utility outages outside our control.</p>

      <h2>Changes</h2>
      <p>We may update these terms at any time. Continued use of our services means you accept the updated terms.</p>

      <p className="text-xs text-muted-foreground mt-8">These policies are basic business terms and should be reviewed by an attorney for full legal compliance.</p>
    </div>
  );
}
