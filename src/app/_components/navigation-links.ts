type PrimaryNavigationLink = {
  href: string;
  label: string;
  emphasis?: boolean;
};

export const primaryNavigationLinks: readonly PrimaryNavigationLink[] = [
  { href: "/about", label: "About" },
  { href: "/our-work", label: "Our Work" },
  { href: "/impact", label: "Impact" },
  { href: "/events", label: "Events" },
  { href: "/matches", label: "Match Centre" },
  { href: "/play", label: "Play for Impact" },
  { href: "/stories", label: "Stories" },
  { href: "/contact", label: "Contact" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/donate", label: "Donate", emphasis: true },
];
