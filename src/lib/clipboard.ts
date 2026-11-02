// Client-only. Copy text (optionally formatted HTML) to the clipboard.

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

/** True if copied. With html, rich editors (Mailchimp, Gmail, Word) paste it formatted; plain fields get the text. */
export async function copyToClipboard(text: string, html?: string) {
  try {
    if (html && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    // In-app browsers (Facebook, Instagram) often block the Clipboard API but allow the older method.
    return legacyCopy(text, html);
  }
}
