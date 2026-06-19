"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { SIGNIN_EMAIL_DOMAIN_ERROR } from "@/lib/auth/allowed-email-domain";

/**
 * Surfaces sign-in failures redirected back to the landing page. Better Auth
 * appends an `error` query param when an OAuth callback is rejected — most
 * commonly the @sltwtr.com domain restriction enforced in the auth hooks.
 */
export function SignInErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error) {
      return;
    }

    const normalized = decodeURIComponent(error).toLowerCase();
    if (
      normalized.includes("forbidden") ||
      normalized.includes("sltwtr") ||
      normalized.includes("restricted") ||
      normalized.includes("domain")
    ) {
      setMessage(SIGNIN_EMAIL_DOMAIN_ERROR);
    } else {
      setMessage("Sign-in failed. Please try again.");
    }
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
