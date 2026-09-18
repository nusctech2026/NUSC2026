export const club = {
  name: "Nagaland United Sports Club",
  shortName: "NUSC",
  motto: "Rise Together",
  email: "nagalandunitedsportsclub@gmail.com",
  instagram: "https://instagram.com/nagalandunited",
  address: "Razhaphe Basa, Chümoukedima District, Nagaland, India",
  registration: "HOME/SRC-7926",
};

export const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://127.0.0.1:3102";

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
  { href: "/shop", label: "Shop" },
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
};
