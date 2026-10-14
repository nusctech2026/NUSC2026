export const club = {
  name: "Nagaland United Sports Club",
  shortName: "NUSC",
  motto: "Rise Together",
  email: "connect@nagalandunited.com",
  phone: "+91 8837459822",
  instagram: "https://instagram.com/nagalandunited",
  address: "Opposite Cricket Stadium, Chumukedima Main Road, Sovima Village 6th Mile, PIN: 797103, Nagaland, India",
  registration: "HOME/SRC-7926",
  entityType: "Society registered with the Government of Nagaland (Reg. No. HOME/SRC-7926)",
  supportHours: "Monday–Saturday, 10:00 AM – 5:00 PM IST (excluding public holidays)",
  grievanceOfficer: "Lhouvi",
};

export const storeUrl =
  process.env.NEXT_PUBLIC_STORE_URL || "http://127.0.0.1:3103";

export const careersDeadline = "September 2026";
export const applicationBody =
  "Please attach your CV, certifications and a short cover letter (including your salary expectations).";

export function emailLink(subject = "Enquiry — NUSC", body = "") {
  return `mailto:${club.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
}

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/club", label: "Club" },
  { href: "/honours", label: "Honours" },
  { href: "/pathway", label: "Player Pathway" },
  { href: "/community", label: "Community" },
  { href: "/partners", label: "Partners" },
  { href: "/careers", label: "Careers" },
  { href: storeUrl, label: "Shop" },
  { href: "/contact", label: "Contact" },
] as const;

export const legacyLinks: Record<string, string> = {
  "#home": "/",
  "#club": "/club",
  "#journey": "/club#journey",
  "#honours": "/honours",
  "#pathway": "/pathway",
  "#community": "/community",
  "#partners": "/partners",
  "#careers": "/careers",
  "#contact": "/contact",
  "#about": "/about",
  "#pricing": "/pricing",
  "#terms": "/terms",
  "#privacy": "/privacy-policy",
  "#cancellation": "/cancellation-policy",
  "#refund": "/refund-policy",
  "#shipping": "/shipping-and-delivery-policy",
  "#press": "/press-accreditation",
  "#media": "/press-accreditation",
};
