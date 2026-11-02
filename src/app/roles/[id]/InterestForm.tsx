"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerInterest, type InterestState } from "./actions";

type Props = {
  opportunityId: string;
  signedIn: boolean;
  adultConfirmed: boolean;
  defaultName: string;
  email: string;
  phone: string;
  status: string | null;
  full: boolean;
};

const btn = "h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold flex items-center justify-center no-underline hover:text-white";

export function InterestForm(p: Props) {
  const [state, action, pending] = useActionState<InterestState, FormData>(registerInterest, {});

  if (!p.signedIn)
    return <Link href={"/sign-in?next=/roles/" + p.opportunityId} className={btn}>Sign in to say you're interested</Link>;

  if (state.ok || p.status === "interested")
    return <p className="m-0 rounded-2xl bg-cream p-4 text-lg"><strong>You're on the list.</strong> The group will confirm with you directly. Track it in <Link href="/me">My volunteering</Link>.</p>;
  if (p.status === "confirmed")
    return <p className="m-0 rounded-2xl bg-sky-tint p-4 text-lg"><strong>You're confirmed.</strong> See <Link href="/me">My volunteering</Link>.</p>;
  if (p.full) return <p className="m-0 text-slate">Check back later in case a spot opens.</p>;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="opportunityId" value={p.opportunityId} />
      <label className="flex flex-col gap-1.5 font-bold">
        Your name, as the group will see it
        <input name="displayName" defaultValue={p.defaultName} required className="h-12 rounded-xl border-[1.5px] border-sand-line px-3.5 text-[17px] font-normal" />
      </label>
      <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
        <legend className="font-bold mb-1">Share with the group</legend>
        {p.email && <Check name="shareEmail" label={"Email · " + p.email} defaultChecked />}
        {p.phone && <Check name="sharePhone" label={"Phone · " + p.phone} defaultChecked={!p.email} />}
      </fieldset>
      {!p.adultConfirmed && <Check name="adult" label="I'm 18 or over" />}
      {p.adultConfirmed && <input type="hidden" name="adult" value="on" />}
      <label className="flex flex-col gap-1.5 font-bold">
        Note for the group <span className="font-normal text-slate">(optional)</span>
        <textarea name="note" rows={3} className="rounded-xl border-[1.5px] border-sand-line px-3.5 py-3 text-[17px] font-normal" />
      </label>
      {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
      <button disabled={pending} className={btn + " disabled:opacity-60"}>{pending ? "Sending…" : "I'm interested"}</button>
      <p className="m-0 text-[15px] text-slate">Nothing else about you is shared.</p>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 min-h-11 text-[17px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-5 h-5 accent-navy" />
      {label}
    </label>
  );
}
