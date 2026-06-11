import { useEffect } from "react";

function _useTitle(t:string){ useEffect(()=>{const o=document.title;document.title=t;return()=>{document.title=o;};},[t]); return null; }
export default function Privacy() {
  return (
    <div className="container-tight py-10 prose prose-sm max-w-3xl">
      {(_useTitle as any)("Privacy Policy | Shabba & Sons Electric")}
      
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>Information we collect</h2>
      <p>When you contact us, request a quote, schedule a job, redeem a voucher, or apply for work, we collect the information you give us:</p>
      <ul>
        <li>Name, phone number, email, and service address</li>
        <li>Details about the work you need and any photos you upload</li>
        <li>Payment information needed to invoice and accept payment for the job</li>
        <li>If you apply to work with us: resume, license, certifications, and references you provide</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>Contact you about your request, schedule visits, send estimates, complete jobs, and follow up after</li>
        <li>Send text or email updates about your job, vouchers, or appointments</li>
        <li>Keep records required for taxes, permits, inspections, and warranty</li>
        <li>Review job applications and contact references</li>
      </ul>

      <h2>SMS and text consent</h2>
      <p>By submitting a form with your phone number, you agree to receive job-related text messages from Shabba & Sons Electric. Standard message and data rates apply. Reply STOP to opt out.</p>

      <h2>Photos</h2>
      <p>Photos you upload are used to prepare your estimate and document the work. We may also use job photos in our portfolio if they do not show personal information. Tell us if you do not want your photos used publicly.</p>

      <h2>Sharing</h2>
      <p>We do not sell your information. We may share it with workers assigned to your job, with permitting and inspection offices when required, and with payment processors so we can collect payment.</p>

      <h2>Your choices</h2>
      <p>You can ask us to update or delete your information at any time by contacting us.</p>

      <h2>Contact</h2>
      <p>Shabba & Sons Electric · Columbus, OH · Use the <a href="/contact">contact page</a> for questions about this policy.</p>

      <p className="text-xs text-muted-foreground mt-8">These policies are basic business terms and should be reviewed by an attorney for full legal compliance.</p>
    </div>
  );
}
