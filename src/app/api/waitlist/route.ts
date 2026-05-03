import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { PRODUCT } from "@/lib/config";

const WAITLIST_LIMIT = { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }; // 3 per day per IP

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`waitlist:${ip}`, WAITLIST_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const type = body.type === "pro" || body.type === "enterprise" ? body.type : null;
    const name = (body.name ?? "").trim().slice(0, 100);
    const email = (body.email ?? "").trim().slice(0, 254);
    const issues = (body.issues ?? "").trim().slice(0, 1000);
    const features = (body.features ?? "").trim().slice(0, 1000);
    // enterprise-only
    const companyName = (body.companyName ?? "").trim().slice(0, 120) || null;
    const timeline = (body.timeline ?? "").trim().slice(0, 20) || null;
    const skillNeeds = (body.skillNeeds ?? "").trim().slice(0, 1500) || null;

    if (!type) {
      return NextResponse.json({ error: "Invalid enquiry type." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (type === "pro") {
      if (!issues || issues.length < 10)
        return NextResponse.json({ error: "Issues field must be at least 10 characters." }, { status: 400 });
      if (!features || features.length < 10)
        return NextResponse.json({ error: "Features field must be at least 10 characters." }, { status: 400 });
    } else {
      if (!skillNeeds || skillNeeds.length < 10)
        return NextResponse.json({ error: "Skill needs field must be at least 10 characters." }, { status: 400 });
    }

    // Persist to DB
    const admin = createAdminClient();
    await admin.from("pricing_inquiries").insert({
      type,
      name: name || null,
      email,
      issues: issues || null,
      expected_features: features || null,
      company_name: companyName,
      timeline,
      skill_needs: skillNeeds,
    });

    const isPro = type === "pro";
    const subject = isPro
      ? `[Pro Waitlist] ${email}`
      : `[Enterprise Enquiry] ${email}${name ? ` — ${name}` : ""}`;

    // Notify support inbox
    await sendEmail({
      to: PRODUCT.supportEmail,
      subject,
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 0; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: #fff; padding: 22px 26px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .content { background: #f7f7f7; padding: 22px 26px; border-radius: 0 0 10px 10px; border: 1px solid #e8e8e8; border-top: none; }
    .box { background: #fff; padding: 13px 16px; border-radius: 7px; margin: 9px 0; border: 1px solid #e8e8e8; border-left: 4px solid #1e293b; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 0 0 4px; }
    .value { font-size: 14px; color: #111; white-space: pre-wrap; margin: 0; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isPro ? "🚀 New Pro Waitlist Signup" : "🏢 New Enterprise Enquiry"} — ${PRODUCT.name}</h1>
    </div>
    <div class="content">
      ${name ? `<div class="box"><p class="label">Name</p><p class="value">${name}</p></div>` : ""}
      <div class="box"><p class="label">${isPro ? "Email" : "Work Email"}</p><p class="value">${email}</p></div>
      ${!isPro && companyName ? `<div class="box"><p class="label">Company</p><p class="value">${companyName}</p></div>` : ""}
      ${!isPro && timeline ? `<div class="box"><p class="label">Timeline</p><p class="value">${timeline}</p></div>` : ""}
      ${!isPro && skillNeeds ? `<div class="box"><p class="label">SKILL file needs</p><p class="value">${skillNeeds}</p></div>` : ""}
      ${isPro && issues ? `<div class="box"><p class="label">Issues they're facing</p><p class="value">${issues}</p></div>` : ""}
      ${isPro && features ? `<div class="box"><p class="label">Features they expect</p><p class="value">${features}</p></div>` : ""}
      <div class="box"><p class="label">Submitted at</p><p class="value">${new Date().toLocaleString()}</p></div>
    </div>
    <div class="footer"><p>${PRODUCT.name} · ${PRODUCT.domain}</p></div>
  </div>
</body>
</html>`,
    });

    // Confirmation to submitter
    await sendEmail({
      to: email,
      subject: isPro
        ? `You're on the ${PRODUCT.name} Pro waitlist!`
        : `We received your ${PRODUCT.name} Enterprise enquiry`,
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 0; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: #fff; padding: 22px 26px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .content { background: #f7f7f7; padding: 22px 26px; border-radius: 0 0 10px 10px; border: 1px solid #e8e8e8; border-top: none; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 18px; }
    .footer a { color: #1e293b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isPro ? "🚀 You're on the waitlist!" : "✅ Enquiry received!"}</h1>
    </div>
    <div class="content">
      ${isPro
        ? `<p style="font-size:15px;">Thanks for signing up for early access to <strong>${PRODUCT.name} Pro</strong>! We'll email you the moment Pro launches — your founding member price of <strong>$12/mo</strong> will be locked in for you.</p>
           <p style="font-size:14px; color:#555; margin-top:12px;">In the meantime, you can use the <a href="https://${PRODUCT.domain}" style="color:#1e293b;">free Starter plan</a> — no card required.</p>`
        : `<p style="font-size:15px;">Thanks for reaching out about <strong>${PRODUCT.name} Enterprise</strong>! We've received your enquiry and will follow up within <strong>1–2 business days</strong> to discuss how we can help your team.</p>`
      }
    </div>
    <div class="footer"><p>${PRODUCT.name} · <a href="https://${PRODUCT.domain}">${PRODUCT.domain}</a></p></div>
  </div>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/waitlist] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
