// Business constants for Shabba & Sons Electric
export const BUSINESS = {
  name: "Shabba & Sons Electric",
  shortName: "Shabba & Sons",
  phone: "614-671-8528",
  phoneDigits: "16146718528",
  email: "Shabba.sonllc@gmail.com",
  city: "Columbus",
  state: "Ohio",
  serviceArea: "Columbus, Ohio and surrounding areas",
  // Replace with real Google Business review URL when available
  googleReviewUrl: "https://g.page/r/REPLACE_WITH_YOUR_GOOGLE_REVIEW_LINK/review",
  smsDefaultBody: "Hi Shabba — I have an electrical job I'd like a quote on.",
} as const;

export const telHref = `tel:+${BUSINESS.phoneDigits}`;
export const smsHref = (body = BUSINESS.smsDefaultBody) =>
  `sms:+${BUSINESS.phoneDigits}?&body=${encodeURIComponent(body)}`;
