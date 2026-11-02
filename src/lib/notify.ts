import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { toE164 } from "@/lib/format";

// Email goes through SMTP: the local mail catcher in development, Resend's SMTP in production.
// Texts go through Twilio. Either is skipped (not failed) when it isn't set up yet.

export type SendResult = { status: "sent" | "skipped" | "failed"; detail?: string };

let transport: Transporter | null = null;

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<SendResult> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_FROM) return { status: "skipped", detail: "Email not set up (SMTP_HOST, SMTP_FROM)" };
  transport ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  try {
    await transport.sendMail({ from: SMTP_FROM, to, subject, text, html });
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", detail: String(e).slice(0, 300) };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return { status: "skipped", detail: "Text messages not set up (TWILIO_*)" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(sid + ":" + token).toString("base64") },
    body: new URLSearchParams({ To: toE164(to), From: from, Body: body }),
  });
  if (res.ok) return { status: "sent" };
  return { status: "failed", detail: ("Twilio " + res.status + ": " + (await res.text())).slice(0, 300) };
}
