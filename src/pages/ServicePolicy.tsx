import { useEffect } from "react";

function _useTitle(t:string){ useEffect(()=>{const o=document.title;document.title=t;return()=>{document.title=o;};},[t]); return null; }
export default function ServicePolicy() {
  return (
    <div className="container-tight py-10 prose prose-sm max-w-3xl">
      {(_useTitle as any)("Service Policy | Shabba & Sons Electric")}
      
      <h1>Service Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>Scheduling</h2>
      <p>We schedule jobs in the order they are confirmed. Same-week or same-day service depends on availability. Emergency calls are handled as quickly as possible.</p>

      <h2>Estimates</h2>
      <p>Free estimates are offered for most residential and small commercial work. Diagnostic visits may carry a service fee that is credited toward the job if you hire us.</p>

      <h2>Deposits</h2>
      <p>For larger jobs, a deposit may be required before we order materials or hold a slot. Deposits are non-refundable once materials have been ordered or work has begun.</p>

      <h2>Materials</h2>
      <p>Material prices change. If the price of materials goes up between estimate and install, we will let you know before charging the difference.</p>

      <h2>Permits and inspections</h2>
      <p>We coordinate permits and inspections required by your jurisdiction. Permit and inspection fees are separate from labor unless the estimate says otherwise.</p>

      <h2>Change orders</h2>
      <p>If you want to add or change work after we start, we will document the change and price before continuing.</p>

      <h2>Cancellations and reschedules</h2>
      <p>Please give us as much notice as you can. Same-day cancellations may incur a trip charge.</p>

      <h2>Access</h2>
      <p>You agree to provide safe access to the work area, power if needed, and a way to enter the property at the scheduled time.</p>

      <h2>Warranty</h2>
      <p>Labor on most jobs is warrantied for 12 months. Manufacturer warranties apply to materials. Call us if something is not working right and we will come back.</p>

      <h2>Safety and code</h2>
      <p>All work is performed to current applicable electrical code. We will not perform work that violates code or creates a safety hazard.</p>

      <p className="text-xs text-muted-foreground mt-8">These policies are basic business terms and should be reviewed by an attorney for full legal compliance.</p>
    </div>
  );
}
