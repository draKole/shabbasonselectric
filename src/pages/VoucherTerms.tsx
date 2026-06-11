import { Helmet } from "react-helmet-async";

export default function VoucherTerms() {
  return (
    <div className="container-tight py-10 prose prose-sm max-w-3xl">
      <Helmet><title>Voucher Terms | Shabba & Sons Electric</title></Helmet>
      <h1>Service Voucher Terms</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Service vouchers are prepaid labor credit that you can apply toward future electrical work performed by Shabba & Sons Electric.</p>

      <h2>What's included</h2>
      <ul>
        <li>Labor credit only, unless the offer specifically says otherwise.</li>
        <li>Materials, permits, inspection fees, and emergency calls are separate unless your voucher says they are included.</li>
      </ul>

      <h2>Scheduling</h2>
      <p>Vouchers must be redeemed by appointment scheduled at least 7 days in advance and are subject to availability. Same-day and emergency use is not guaranteed.</p>

      <h2>Cash value</h2>
      <p>Vouchers are not redeemable for cash unless required by law or unless we approve a refund in writing.</p>

      <h2>Combining offers</h2>
      <p>Vouchers cannot be combined with other discounts or promotions unless we approve it in writing.</p>

      <h2>Status</h2>
      <p>A voucher must be active and approved by Shabba & Sons Electric before it can be used. Voided, cancelled, or refunded vouchers cannot be redeemed.</p>

      <h2>Expiration</h2>
      <p>Vouchers expire on the date printed on the voucher. We may extend expirations at our discretion.</p>

      <h2>Transfer</h2>
      <p>Vouchers may be transferred to another customer with our written approval.</p>

      <p className="text-xs text-muted-foreground mt-8">These policies are basic business terms and should be reviewed by an attorney for full legal compliance.</p>
    </div>
  );
}
