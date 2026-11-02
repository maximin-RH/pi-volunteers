"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SharePost = {
  id: string; title: string; orgName: string; orgSlug: string;
  when: string; where: string; peopleNeeded: number; description: string | null;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

/** Copies by selecting off-screen content. Keeps formatting when html is given. */
function legacyCopy(text: string, html?: string) {
  const el = document.createElement("div");
  if (html) el.innerHTML = html; else el.textContent = text;
  el.style.cssText = "position:fixed;left:-9999px;top:0;white-space:pre-wrap";
  document.body.appendChild(el);
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  sel?.removeAllRanges();
  el.remove();
  return ok;
}

const pill ="min-h-11 px-3.5 whitespace-nowrap rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] flex items-center justify-center gap-2 no-underline hover:border-navy";
const section = "flex flex-col gap-2.5 pt-4 border-t border-sand-line";

export function ShareDialog({ post }: { post: SharePost }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => setCanNativeShare(typeof navigator.share === "function"), []);

  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const url = base + "/roles/" + post.id;
  const orgUrl = base + "/orgs/" + post.orgSlug;
  const close = () => router.replace("/org/dashboard");

  const details = [post.orgName, post.when, post.where].filter(Boolean).join(" · ");
  const needed = post.peopleNeeded + (post.peopleNeeded === 1 ? " person" : " people") + " needed.";
  const blurb = post.description ? clip(post.description.trim(), 280) : "";
  const short = `Volunteers needed: ${post.title}. ${details}. ${needed}`;

  const newsletterText = [`Volunteers needed: ${post.title}`, `${details}. ${needed}`, blurb, `Say you're interested: ${url}`].filter(Boolean).join("\n\n");
  const newsletterHtml =
    `<p><strong>Volunteers needed: ${esc(post.title)}</strong><br>${esc(details)}. ${esc(needed)}</p>` +
    (blurb ? `<p>${esc(blurb)}</p>` : "") +
    `<p><a href="${esc(url)}">Say you're interested on Pi-Volunteers</a></p>`;
  const buttonHtml =
    `<a href="${esc(url)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#D2601A;color:#ffffff;font-weight:bold;text-decoration:none">Volunteer: ${esc(post.title)}</a>`;

  async function copy(key: string, text: string, html?: string) {
    try {
      // With html, rich editors (Mailchimp, Gmail, Word) paste it formatted; plain fields get the text.
      if (html && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(key);
    } catch {
      // In-app browsers (Facebook, Instagram) often block the Clipboard API but allow the older method.
      setCopied(legacyCopy(text, html) ? key : "failed");
    }
  }
  const label = (key: string, text: string) => (copied === key ? "Copied" : text);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button aria-label="Close" onClick={close} className="absolute inset-0 bg-navy-deep/55" />
      <div role="dialog" aria-modal="true" aria-label="Share your post" className="relative w-full max-w-[600px] max-h-[calc(100vh-48px)] overflow-auto bg-white rounded-panel p-7 flex flex-col gap-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-orange">Live on Pi-Volunteers</span>
            <h2 className="m-0 text-[26px] leading-tight">Share it where Island locals look</h2>
          </div>
          <button onClick={close} className="shrink-0 min-h-11 px-4 rounded-full border-[1.5px] border-sand-line bg-white font-bold hover:border-navy">Done</button>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-bold">Link to this role</span>
          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Link to this role" onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 h-12 rounded-xl border-[1.5px] border-sand-line bg-paper px-3.5 text-[15px]" />
            <button onClick={() => copy("link", url)} className="shrink-0 h-12 px-5 rounded-full bg-navy hover:bg-navy-deep text-white font-bold">{label("link", "Copy link")}</button>
          </div>
          <span className="text-sm text-slate">Paste it anywhere. Facebook, WhatsApp and most apps show a preview with the photo, date and spots needed.</span>
        </div>

        <div className={section}>
          <span className="font-bold">Post or message</span>
          <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            <a href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)} target="_blank" rel="noopener" className={pill}>Facebook</a>
            <a href={"https://wa.me/?text=" + encodeURIComponent(short + " " + url)} target="_blank" rel="noopener" className={pill}>WhatsApp</a>
            <a href={"mailto:?subject=" + encodeURIComponent("Volunteers needed: " + post.title) + "&body=" + encodeURIComponent(newsletterText)} className={pill}>Email</a>
            <a href={"sms:?&body=" + encodeURIComponent(short + " " + url)} className={pill}>Text message</a>
            {canNativeShare && (
              <button onClick={() => navigator.share({ title: post.title, text: short, url }).catch(() => {})} className={pill}>More apps</button>
            )}
          </div>
        </div>

        <div className={section}>
          <span className="font-bold">Newsletter or noticeboard</span>
          <div className="rounded-xl bg-cream p-4 text-[15px] whitespace-pre-line max-h-40 overflow-auto">{newsletterText}</div>
          <button onClick={() => copy("newsletter", newsletterText, newsletterHtml)} className={pill + " self-start"}>{label("newsletter", "Copy newsletter text")}</button>
        </div>

        <div className={section}>
          <span className="font-bold">Your website</span>
          <span className="text-[15px] text-slate">Link once to your page on Pi-Volunteers. It always lists your current roles, so you won't need to update your site for each new post.</span>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => copy("org", orgUrl)} className={pill}>{label("org", "Copy link to all your roles")}</button>
            <button onClick={() => copy("button", buttonHtml)} className={pill}>{label("button", "Copy button code for this role")}</button>
          </div>
          <span className="text-sm text-slate">The button code is for whoever looks after your website. It pastes into most site builders as an HTML or embed block.</span>
        </div>

        {copied === "failed" && <p role="alert" className="m-0 text-rust font-bold">Your browser blocked copying. Select the text and copy it by hand.</p>}
        {/* TODO(phase 2): Noticeboard PDF with QR code. */}
      </div>
    </div>
  );
}
