"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/about", label: "About" },
  { href: "/our-work", label: "Our Work" },
  { href: "/impact", label: "Impact" },
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories" },
  { href: "/matches", label: "Live Matches" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/donate", label: "Donate" },
];

// The desktop nav is hidden below 800px, so this is the only way to reach
// interior pages on a phone.
export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="refi-mobile-navigation">
      <button
        className="refi-mobile-toggle"
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="refi-mobile-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
      </button>
      {open && (
        <nav id="refi-mobile-menu" className="refi-mobile-menu" aria-label="Mobile navigation">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
