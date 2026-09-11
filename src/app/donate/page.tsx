"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { useState } from "react";
import { refiImages } from "@/lib/media";

const amounts = [5000, 10000, 25000, 50000, 100000, 250000];

export default function DonatePage() {
  const [amount, setAmount] = useState(25000);
  const emailHref = `mailto:hello@refifoundation.org?subject=${encodeURIComponent("Donation enquiry")}&body=${encodeURIComponent(`I would like to support REFI Foundation with a donation of ₦${amount.toLocaleString()}. Please share the appropriate payment details and next steps.`)}`;

  return (
    <main className="refi-page-shell refi-donate">
      <section className="refi-donate-hero">
        <div className="refi-container">
          <p className="refi-eyebrow">Support REFI Foundation</p>
          <h1 className="refi-serif">Give opportunity a place to grow.</h1>
          <p>Your support can help REFI develop practical programmes for children, young people and communities — with dignity, accountability and long-term usefulness at the centre.</p>
        </div>
      </section>

      <section className="refi-donate-body refi-reveal">
        <div className="refi-container refi-donate-grid">
          <div className="refi-donate-panel">
            <p className="refi-eyebrow refi-blue-label">Make a donation</p>
            <h2>Choose an amount</h2>
            <p>Select a starting amount below. REFI can then provide the appropriate payment details for your gift.</p>
            <div className="refi-amount-grid" aria-label="Donation amount">
              {amounts.map((value) => (
                <button key={value} type="button" className={`refi-amount ${amount === value ? "is-selected" : ""}`} onClick={() => setAmount(value)} aria-pressed={amount === value}>
                  ₦{value.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="refi-donate-note">Selected donation: <strong>₦{amount.toLocaleString()}</strong><br />For now, donations are coordinated directly with the Foundation. This avoids publishing unverified banking or payment details before the organisation's giving infrastructure is finalised.</div>
            <div className="refi-actions" style={{ marginTop: 24 }}>
              <a className="refi-button refi-button-primary" href={emailHref}><HeartHandshake size={17} /> Continue with donation</a>
            </div>
            <p style={{ fontSize: 13, marginTop: 18 }}>The email will open a donation enquiry addressed to REFI Foundation. No payment information is requested on this page.</p>
          </div>

          <div>
            <div className="refi-donate-side-image"><Image src={refiImages.girls.src} alt={refiImages.girls.alt} fill sizes="(max-width: 800px) 100vw, 40vw" /></div>
            <div className="refi-donate-side-copy">
              <p className="refi-eyebrow refi-blue-label">Why your support matters</p>
              <h2 className="refi-serif">Small acts of support can create practical room for possibility.</h2>
              <p>REFI is building its programme base around education, community support, sport and wellbeing, while maintaining a clear commitment to evidence and responsible reporting.</p>
              <Link href="/our-work" className="refi-button refi-button-secondary refi-button-dark">See our work <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
