"use client";

import { useState } from "react";

/**
 * Sign-in form for the content manager.
 *
 * There is deliberately no "create account" link: accounts are created by the
 * owner in the Supabase dashboard and then added to the administrator list. A
 * public sign-up form on a site's CMS would be an unnecessary risk.
 */
export function SignInForm({ backendReady }: { backendReady: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  if (!backendReady) {
    return (
      <div className="refi-admin-card">
        <h1>Content manager</h1>
        <p className="refi-admin-note">
          The content system has not been connected yet. An administrator needs to add the
          Supabase settings before sign-in can work.
        </p>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNotice("");
    try {
      const response = await fetch("/api/cms/session/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Sign-in failed. Please try again.");
        return;
      }
      // Full reload so the server component re-evaluates the session.
      window.location.reload();
    } catch {
      setMessage("Sign-in failed. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email.includes("@")) {
      setNotice("Enter your email address first, then choose \u201cForgot password\u201d.");
      return;
    }
    setNotice("");
    try {
      await fetch("/api/cms/session/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* the endpoint reports success regardless, to avoid revealing accounts */
    }
    setNotice("If that email has an account, a reset link is on its way.");
  }

  return (
    <div className="refi-admin-card">
      <h1>Content manager</h1>
      <p className="refi-admin-note">Sign in to update the website.</p>
      <form onSubmit={submit} className="refi-admin-form">
        <label htmlFor="cms-email">Email address</label>
        <input
          id="cms-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="cms-password">Password</label>
        <input
          id="cms-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {message ? (
          <p className="refi-admin-error" role="alert">
            {message}
          </p>
        ) : null}
        {notice ? <p className="refi-admin-note">{notice}</p> : null}

        <button className="refi-button refi-button-primary" type="submit" disabled={busy}>
          {busy ? "Signing in\u2026" : "Sign in"}
        </button>
        <button className="refi-admin-link" type="button" onClick={forgotPassword}>
          Forgot password
        </button>
      </form>
    </div>
  );
}
