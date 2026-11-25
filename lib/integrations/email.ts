import nodemailer from "nodemailer";

interface EmailMessage { to: string; subject: string; html: string }

export async function sendTransactionalEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, ...message }),
    });
    if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
    const result = await response.json() as { id: string };
    return { status: "sent" as const, providerReference: result.id };
  }

  const smtpUser = process.env.GMAIL_USER ?? process.env.SMTP_USER;
  const smtpPassword = process.env.GMAIL_PASS ?? process.env.SMTP_APP_PASSWORD;
  if (smtpUser && smtpPassword) {
    const transporter = process.env.GMAIL_USER
      ? nodemailer.createTransport({ service: "gmail", auth: { user: smtpUser, pass: smtpPassword } })
      : nodemailer.createTransport({ host: process.env.SMTP_HOST ?? "smtp.gmail.com", port: Number(process.env.SMTP_PORT ?? "465"), secure: (process.env.SMTP_SECURE ?? "true") === "true", auth: { user: smtpUser, pass: smtpPassword } });
    const result = await transporter.sendMail({ from: process.env.GMAIL_FROM ?? process.env.SMTP_FROM ?? from ?? `NASA EVENT <${smtpUser}>`, ...message });
    return { status: "sent" as const, providerReference: result.messageId };
  }

  return { status: "preview" as const };
}
