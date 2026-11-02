"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const next = useSearchParams().get("next") ?? "/me";
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
      <h1 className="m-0 text-[clamp(36px,4.5vw,52px)] leading-none font-bold tracking-tight">Sign in</h1>
      <p className="m-0 text-lg text-slate">No password. We'll send you a link or a code.</p>

      <div role="tablist" className="flex gap-1 rounded-full bg-sand p-1 self-start">
        {(["email", "phone"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setStage("enter"); setValue(""); setError(""); }}
            className={"h-10 px-5 rounded-full font-bold " + (mode === m ? "bg-white" : "")}>
            {m === "email" ? "Email" : "Mobile number"}
          </button>
        ))}
      </div>

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
    </div>
  );
}

export default function SignIn() {
  return <Suspense><SignInInner /></Suspense>;
}
