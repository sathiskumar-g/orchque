import { Resend } from "resend";
import { PRODUCT } from "@/lib/config";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  // DISABLE_EMAILS=true blocks all outgoing email (use during local dev/testing)
  if (process.env.DISABLE_EMAILS === "true") {
    return { success: true, data: null };
  }

  const senderEmail = process.env.NOREPLY_EMAIL || `no-reply@${PRODUCT.domain}`;
  const fromAddress = `${PRODUCT.name} <${senderEmail}>`;

  try {
    const { data, error } = await getResend().emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("❌ Resend threw exception:", error);
    return { success: false, error };
  }
}

// ─── Shared HTML helpers ───────────────────────────────────────────────────

const BRAND = `#${PRODUCT.color.hex}`;

function emailShell(headerEmoji: string, headerTitle: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111111; margin: 0; padding: 0; background: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${BRAND}; color: #ffffff; padding: 28px 30px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .content { background: #f7f7f7; padding: 28px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e8e8e8; border-top: none; }
    .type-badge { display: inline-block; background: ${BRAND}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px; }
    .info-box { background: #ffffff; padding: 16px 20px; border-radius: 8px; margin: 10px 0; border: 1px solid #e8e8e8; border-left: 4px solid ${BRAND}; }
    .info-box p { margin: 0; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #888888; margin-bottom: 5px !important; }
    .value { font-size: 14px; color: #111111; white-space: pre-wrap; }
    .action-box { margin-top: 20px; padding: 16px 20px; background: #f0ebfd; border-radius: 8px; border-left: 4px solid ${BRAND}; font-size: 14px; color: #111111; }
    .divider { height: 1px; background: #e8e8e8; margin: 20px 0; }
    .footer { text-align: center; color: #888888; font-size: 12px; margin-top: 20px; }
    .footer a { color: ${BRAND}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerEmoji}&nbsp; ${headerTitle}</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>${PRODUCT.name} &middot; <a href="https://${PRODUCT.domain}">${PRODUCT.domain}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function infoBox(label: string, value: string) {
  if (!value) return "";
  return `<div class="info-box"><p class="label">${label}</p><p class="value">${value}</p></div>`;
}

// ─── New user signup notification ─────────────────────────────────────────

export function getNewUserEmail(email: string, userId: string) {
  const body = `
    <div class="type-badge">New Signup</div>
    ${infoBox("Email", email)}
    ${infoBox("User ID", userId)}
    ${infoBox("Signed up at", new Date().toLocaleString())}
    <div class="action-box">📋 New user has joined ${PRODUCT.name}.</div>
  `;
  return emailShell("👤", `New User — ${PRODUCT.name}`, body);
}

// ─── Support ticket notification ──────────────────────────────────────────

export function getSupportTicketEmail(
  userEmail: string,
  subject: string,
  message: string,
  ticketId: string
) {
  const body = `
    <div class="type-badge">Support Ticket</div>
    ${infoBox("From", userEmail)}
    ${infoBox("Subject", subject)}
    ${infoBox("Message", message)}
    ${infoBox("Ticket ID", ticketId)}
    ${infoBox("Submitted at", new Date().toLocaleString())}
    <div class="action-box">⚡ <strong>Action required:</strong> Respond within 24 hours.</div>
  `;
  return emailShell("🎫", "New Support Ticket", body);
}
