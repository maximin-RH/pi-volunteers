"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});

  return (
    <div className="rounded-card bg-white border border-sand-line p-5 flex flex-col gap-2">
      <span className="text-lg font-bold">Your account</span>
      <span className="text-[15px] text-slate">
        Deleting your account removes your name, sign-in, volunteering history, reminder settings and calendar links. Groups lose the details you shared with them through Good Local Life. This can't be undone.
      </span>
      {!open ? (
        <button onClick={() => setOpen(true)} className="self-start h-11 px-5 mt-1 rounded-full border-[1.5px] border-sand-line bg-white font-bold hover:border-rust">
          Delete my account
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-2 mt-1">
          <label className="flex flex-col gap-1.5 font-bold max-w-[280px]">
            Type delete to confirm
            <input name="confirm" autoComplete="off" className="h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal" />
          </label>
          {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
          <div className="flex gap-2 flex-wrap">
            <button disabled={pending} className="h-11 px-5 rounded-full bg-rust text-white font-bold disabled:opacity-60">
              {pending ? "Deleting…" : "Delete my account"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Keep it</button>
          </div>
        </form>
      )}
    </div>
  );
}
