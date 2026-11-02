"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShareDialog({ post }: { post: { id: string; title: string; orgName: string } }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const url = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")) + "/roles/" + post.id;
  const close = () => router.replace("/org/dashboard");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button aria-label="Close" onClick={close} className="absolute inset-0 bg-navy-deep/55" />
      <div role="dialog" aria-modal="true" aria-label="Share your post" className="relative w-full max-w-[520px] max-h-[calc(100vh-48px)] overflow-auto bg-white rounded-panel p-7 flex flex-col gap-4">
        <span className="font-bold text-orange">Live on Pi-Volunteers</span>
        <h2 className="m-0 text-[26px] leading-tight">Share it where Island locals look</h2>
        <p className="m-0 text-slate">Facebook builds the preview card from the role page automatically: photo, title, date and spots needed.</p>
        <a
          href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)}
          target="_blank" rel="noopener"
          className="h-14 rounded-full bg-navy hover:bg-navy-deep text-white hover:text-white text-[17px] font-bold flex items-center justify-center no-underline"
        >
          Share to Facebook
        </a>
        <button
          onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}
          className="h-[50px] rounded-full border-[1.5px] border-sand-line bg-white font-bold"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        {/* TODO(phase 2): Noticeboard PDF with QR code. */}
      </div>
    </div>
  );
}
