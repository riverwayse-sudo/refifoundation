"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";

type FormStatus = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      topic: String(formData.get("topic") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Your message could not be sent. Please try again.");
      }
      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="refi-page-shell refi-contact">
      <SiteHeader />
      <section className="refi-contact-hero">
        <div className="refi-container">
          <p className="refi-eyebrow">Contact REFI Foundation</p>
          <h1 className="refi-serif">Start with a conversation.</h1>
          <p>Ask about our work, explore a partnership, discuss volunteering or tell us how you would like to contribute.</p>
        </div>
      </section>
      <section className="refi-contact-body">
        <div className="refi-container refi-contact-grid">
          <div className="refi-contact-intro">
            <p className="refi-eyebrow refi-blue-label">How can we help?</p>
            <h2 className="refi-serif">Tell us what you have in mind.</h2>
            <p>Share a little context so the right person can follow up. Please do not include sensitive personal or medical information in this form.</p>
            <div className="refi-contact-direct">
              <span>Email</span>
              <a href="mailto:hello@refifoundation.org">hello@refifoundation.org</a>
            </div>
            <p className="refi-contact-note">We will use the details you submit to respond to this enquiry. We do not ask for payment details on this page.</p>
          </div>

          <form className="refi-contact-form" onSubmit={handleSubmit}>
            <div className="refi-contact-field">
              <label htmlFor="contact-name">Full name</label>
              <input id="contact-name" name="name" autoComplete="name" required maxLength={100} />
            </div>
            <div className="refi-contact-field">
              <label htmlFor="contact-email">Email address</label>
              <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} />
            </div>
            <div className="refi-contact-field">
              <label htmlFor="contact-topic">What would you like to discuss?</label>
              <select id="contact-topic" name="topic" defaultValue="General enquiry" required>
                <option>General enquiry</option>
                <option>Programme or community support</option>
                <option>Partnership or sponsorship</option>
                <option>Volunteering</option>
                <option>Media and communications</option>
              </select>
            </div>
            <div className="refi-contact-field">
              <label htmlFor="contact-message">Your message</label>
              <textarea id="contact-message" name="message" rows={6} required minLength={10} maxLength={4000} />
            </div>
            <div className="refi-contact-honeypot" aria-hidden="true">
              <label htmlFor="contact-website">Leave this field empty</label>
              <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {status === "success" && (
              <p className="refi-form-feedback is-success" role="status"><CheckCircle2 size={19} /> Your message has been sent. Thank you for contacting REFI Foundation.</p>
            )}
            {status === "error" && (
              <p className="refi-form-feedback is-error" role="alert"><AlertCircle size={19} /> {errorMessage}</p>
            )}
            <button className="refi-button refi-button-primary" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending message…" : "Send enquiry"} {status !== "sending" && <ArrowRight size={16} />}
            </button>
            <p className="refi-contact-privacy">By sending this form, you are asking REFI Foundation to use your details to respond to your enquiry.</p>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
