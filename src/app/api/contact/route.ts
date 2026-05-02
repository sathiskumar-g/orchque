import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { PRODUCT } from "@/lib/config";

const CONTACT_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 }; // 3 per hour per IP

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`contact:${ip}`, CONTACT_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many messages submitted. Please wait before trying again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email ?? "").trim().slice(0, 254);
    const summary = (body.summary ?? "").trim().slice(0, 120);
    const description = (body.description ?? "").trim().slice(0, 2000);

    // Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!summary || summary.length < 3) {
      return NextResponse.json({ error: "Subject must be at least 3 characters." }, { status: 400 });
    }
    if (!description || description.length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });
    }

    const supportEmail = PRODUCT.supportEmail;

    // Send notification to support inbox
    await sendEmail({
      to: supportEmail,
      subject: `[Contact] ${summary}`,
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 0; padding: 0; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: #fff; padding: 24px 28px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { background: #f7f7f7; padding: 24px 28px; border-radius: 0 0 10px 10px; border: 1px solid #e8e8e8; border-top: none; }
    .info-box { background: #fff; padding: 14px 18px; border-radius: 8px; margin: 10px 0; border: 1px solid #e8e8e8; border-left: 4px solid #1e293b; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 0 0 4px; }
    .value { font-size: 14px; color: #111; white-space: pre-wrap; margin: 0; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>📬 New Contact Message — ${PRODUCT.name}</h1></div>
    <div class="content">
      <div class="info-box"><p class="label">From</p><p class="value">${email}</p></div>
      <div class="info-box"><p class="label">Subject</p><p class="value">${summary}</p></div>
      <div class="info-box"><p class="label">Message</p><p class="value">${description}</p></div>
      <div class="info-box"><p class="label">Received at</p><p class="value">${new Date().toLocaleString()}</p></div>
    </div>
    <div class="footer"><p>${PRODUCT.name} · ${PRODUCT.domain}</p></div>
  </div>
</body>
</html>`,
    });

    // Send confirmation to sender
    await sendEmail({
      to: email,
      subject: `We received your message — ${PRODUCT.name}`,
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 0; padding: 0; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: #fff; padding: 24px 28px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { background: #f7f7f7; padding: 24px 28px; border-radius: 0 0 10px 10px; border: 1px solid #e8e8e8; border-top: none; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
    .footer a { color: #1e293b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✅ Message Received</h1></div>
    <div class="content">
      <p style="font-size: 15px;">Thanks for reaching out to ${PRODUCT.name}! We've received your message and will get back to you within <strong>24 hours</strong>.</p>
      <p style="font-size: 14px; color: #555;">If your query is urgent, you can also reply directly to this email or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
      <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 20px 0;" />
      <p style="font-size: 13px; color: #888;"><strong>Your subject:</strong> ${summary}</p>
    </div>
    <div class="footer"><p>${PRODUCT.name} · <a href="https://${PRODUCT.domain}">${PRODUCT.domain}</a></p></div>
  </div>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/contact] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
