"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { SMS_ENABLED } from "@/lib/features";

const input = "h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] w-full";
const btn = "h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold disabled:opacity-60";

/** Australian mobile → E.164. "0412 345 678" → "+61412345678". */
function toE164(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("61")) return "+" + d;
  if (d.startsWith("0")) return "+61" + d.slice(1);
  return "+61" + d;
}

function SignInInner() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/me";
  const deleted = params.get("account") === "deleted";
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"enter" | "sent">("enter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const redirect = window.location.origin + "/auth/callback?next=" + encodeURIComponent(next);
    const { error } = mode === "email"
      ? await supabase.auth.signInWithOtp({ email: value.trim(), options: { emailRedirectTo: redirect } })
      : await supabase.auth.signInWithOtp({ phone: toE164(value) });
    setBusy(false);
    if (error) setError(error.message); else setStage("sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ phone: toE164(value), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) setError("That code didn't work. Check it, or send a new one.");
    else { router.replace(next); router.refresh(); }
  }

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-12 pb-16 flex flex-col gap-6">
      {deleted && <p role="status" className="m-0 rounded-2xl bg-sky-tint p-5 text-lg"><strong>Your account has been deleted.</strong> Thanks for volunteering with us.</p>}
      <h1 className="m-0 text-[clamp(36px,4.5vw,52px)] leading-none font-bold tracking-tight">Sign in</h1>
      <p className="m-0 text-lg text-slate">No password. {SMS_ENABLED ? "We'll send you a link or a code." : "We'll email you a link."}</p>

      {SMS_ENABLED && <div role="tablist" className="flex gap-1 rounded-full bg-sand p-1 self-start">
        {(["email", "phone"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setStage("enter"); setValue(""); setError(""); }}
            className={"h-10 px-5 rounded-full font-bold " + (mode === m ? "bg-white" : "")}>
            {m === "email" ? "Email" : "Mobile number"}
          </button>
        ))}
      </div>}

      {stage === "enter" && (
        <form onSubmit={send} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 font-bold">
            {mode === "email" ? "Email address" : "Mobile number"}
            <input className={input + " font-normal"} required value={value} onChange={(e) => setValue(e.target.value)}
              type={mode === "email" ? "email" : "tel"} autoComplete={mode === "email" ? "email" : "tel"}
              placeholder={mode === "email" ? "you@example.com" : "0412 345 678"} />
          </label>
          <button disabled={busy} className={btn}>{busy ? "Sending…" : mode === "email" ? "Email me a sign-in link" : "Text me a code"}</button>
        </form>
      )}

      {stage === "sent" && mode === "email" && (
        <p className="m-0 rounded-2xl bg-cream p-5 text-lg">Check <strong>{value}</strong> for a sign-in link. It expires in 1 hour.</p>
      )}

      {stage === "sent" && mode === "phone" && (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 font-bold">
            6-digit code sent to {value}
            <input className={input + " font-normal tracking-[0.3em]"} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button disabled={busy} className={btn}>{busy ? "Checking…" : "Sign in"}</button>
        </form>
      )}

      {error && <p role="alert" className="m-0 text-rust font-bold">{error}</p>}

      {/* Collection notice (APP 5): what we collect here and why. */}
      <p className="m-0 text-[15px] text-slate">
        We use your {mode === "email" ? "email address" : "mobile number"} to sign you in and, if you choose, to send reminders for volunteer slots you've confirmed.
        It's kept secure, never sold, and only shared with a group if you tick to share it. <a href="/privacy">How we handle your information</a>
      </p>
    </div>
  );
}

export default function SignIn() {
  return <Suspense><SignInInner /></Suspense>;
}
