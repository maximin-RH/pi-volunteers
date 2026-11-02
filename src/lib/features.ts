// Feature switches. Anything that costs money per use stays off until it's funded.

/** Text messages (SMS sign-in codes and text reminders) cost about A$0.08–0.10 each via Twilio.
 *  Off until funded: set NEXT_PUBLIC_SMS_ENABLED=true (and the TWILIO_* settings) to turn back on. */
export const SMS_ENABLED = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";
