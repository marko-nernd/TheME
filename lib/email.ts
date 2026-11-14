import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

export async function sendVerificationEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const verificationUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>",
    to: email,
    subject: "Verify your Model Escape account",
    text: `Hi ${name},\n\nVerify your email to complete your application:\n${verificationUrl}\n\nAfter verification, an administrator will review your account. We will email you when it is approved. This link expires in 24 hours.`,
    html: `
      <div style="font-family:Montserrat,Arial,sans-serif;background:#11110f;color:#fff;padding:40px">
        <p style="color:#ff2d95;font-size:12px;letter-spacing:2px;text-transform:uppercase">Model Escape</p>
        <h1 style="font-size:38px;line-height:1.05">Verify your email.</h1>
        <p style="color:#c9c7c0;line-height:1.7">Hi ${safeName}, confirm your address to complete your application. An administrator will then review your account. We will email you when it is approved.</p>
        <p style="margin:32px 0"><a href="${verificationUrl}" style="display:inline-block;background:#ff2d95;color:#11110f;padding:16px 22px;text-decoration:none;font-weight:700">Verify email and continue →</a></p>
        <p style="color:#777;font-size:12px">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ email, name, token }: { email: string; name: string; token: string }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>", to: email,
    subject: "Reset your Model Escape password",
    text: `Hi ${name},\n\nUse this link to choose a new password:\n${url}\n\nThe link expires in one hour and can only be used once. If you did not request this email, you can ignore it.`,
    html: `<div style="font-family:Montserrat,Arial,sans-serif;background:#11110f;color:#fff;padding:36px"><h1 style="color:#ff2d95">Reset your password.</h1><p>Hi ${escapeHtml(name)}, choose a new password using the button below.</p><p><a href="${url}" style="display:inline-block;padding:16px 24px;background:#ff2d95;color:white;text-decoration:none">Choose new password →</a></p><p>This link expires in one hour and can only be used once. If you did not request it, you can ignore this email.</p></div>`,
  });
}

export async function sendAccountApprovedEmail({ email, name }: { email: string; name: string }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await transport.sendMail({ from: process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>", to: email, subject: "Your Model Escape account is approved", text: `Hi ${name},\n\nYour account has been approved. Sign in and finish your profile:\n${origin}/login` });
}

export async function sendSponsorshipNotice({
  email,
  sponsorName,
  eventTitle,
  direction,
  message,
}: {
  email: string;
  sponsorName: string;
  eventTitle: string;
  direction: "promoter_to_sponsor" | "sponsor_to_event" | "sponsor_to_member";
  message: string;
}) {
  const subject =
    direction === "promoter_to_sponsor"
      ? `New sponsorship invitation: ${eventTitle}`
      : `New sponsor request for ${eventTitle}`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>",
    to: email,
    subject,
    text: `${sponsorName},\n\n${message}\n\nOpen Model Escape to review the sponsorship request for ${eventTitle}.`,
    html: `<div style="font-family:Montserrat,Arial,sans-serif;padding:36px"><p style="color:#ff2d95;font-weight:700">MODEL ESCAPE PARTNERSHIPS</p><h1>${escapeHtml(eventTitle)}</h1><p>${escapeHtml(message)}</p><p>Sign in to review and respond to this sponsorship request.</p></div>`,
  });
}

export async function sendEventConfirmationEmail({
  email,
  name,
  eventTitle,
  startsAt,
  endsAt,
  location,
  pathLabel,
  eventSlug,
  confirmationCode,
  passHref,
}: {
  email: string;
  name: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string;
  pathLabel: string;
  eventSlug: string;
  confirmationCode?: string;
  passHref?: string;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const eventUrl = `${origin}/events/${encodeURIComponent(eventSlug)}`;
  const passUrl = passHref?.startsWith("/passes/") ? `${origin}${passHref}` : null;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Phoenix" });
  const startText = date.format(startsAt);
  const endText = endsAt ? date.format(endsAt) : null;
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(eventTitle);
  const safeLocation = escapeHtml(location);
  const safePath = escapeHtml(pathLabel);
  const safeConfirmation = confirmationCode ? escapeHtml(confirmationCode) : "";

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Model Escape <events@modelescape.local>",
    to: email,
    subject: `You’re confirmed for ${eventTitle}`,
    text: `Hi ${name},\n\nYour payment is complete and your place at ${eventTitle} is confirmed.${confirmationCode ? `\n\nConfirmation number: ${confirmationCode}` : ""}\n\nAdmission: ${pathLabel}\nStarts: ${startText}${endText ? `\nEnds: ${endText}` : ""}\nLocation: ${location}\n\nEvent details: ${eventUrl}`,
    html: `
      <div style="font-family:Montserrat,Arial,sans-serif;background:#11110f;color:#fff;padding:40px">
        <p style="color:#ff2d95;font-size:12px;letter-spacing:2px;text-transform:uppercase">Model Escape · Confirmed</p>
        <h1 style="font-size:38px;line-height:1.05">You’re going to ${safeTitle}.</h1>
        <p style="color:#c9c7c0;line-height:1.7">Hi ${safeName}, your booking is confirmed.</p>
        <div style="margin:28px 0;padding:22px;background:#1d1d1a">
          ${safeConfirmation ? `<p style="color:#ff2d95;font-size:12px;letter-spacing:1px"><strong>CONFIRMATION NUMBER</strong></p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${safeConfirmation}</p>` : ""}
          <p><strong>Admission:</strong> ${safePath}</p>
          <p><strong>Starts:</strong> ${escapeHtml(startText)}</p>
          ${endText ? `<p><strong>Ends:</strong> ${escapeHtml(endText)}</p>` : ""}
          <p><strong>Location:</strong> ${safeLocation}</p>
        </div>
        <p><a href="${eventUrl}" style="display:inline-block;background:#ff2d95;color:#fff;padding:16px 22px;text-decoration:none;font-weight:700">View event details →</a></p>
        ${passUrl ? `<p><a href="${escapeHtml(passUrl)}" style="color:#ff70ae;font-weight:700">Open your private event pass and calendar →</a></p>` : ""}
        <p style="color:#777;font-size:12px">Keep this email for your event details.</p>
      </div>
    `,
  });
}

export async function sendGuestEventAccessEmail({
  email,
  name,
  eventTitle,
  participationId,
  guestToken,
}: {
  email: string;
  name: string;
  eventTitle: string;
  participationId: string;
  guestToken: string;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const encodedToken = encodeURIComponent(guestToken);
  const checkoutUrl = `${origin}/checkout/event/${encodeURIComponent(participationId)}?token=${encodedToken}`;
  const appUrl = `modelescape://guest-pass?participationId=${encodeURIComponent(participationId)}&token=${encodedToken}`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Model Escape <events@modelescape.local>",
    to: email,
    subject: `Your access link for ${eventTitle}`,
    text: `Hi ${name},\n\nKeep this private link to continue checkout and open your Model Escape event pass after payment:\n${appUrl}\n\nYou can also continue checkout in a browser:\n${checkoutUrl}`,
    html: `
      <div style="font-family:Montserrat,Arial,sans-serif;background:#050505;color:#fff;padding:40px">
        <p style="color:#ff2d95;font-size:12px;letter-spacing:2px;text-transform:uppercase">Model Escape · Guest Access</p>
        <h1 style="font-size:36px;line-height:1.05">Keep your access to ${escapeHtml(eventTitle)}.</h1>
        <p style="color:#c9c7c0;line-height:1.7">Hi ${escapeHtml(name)}, use this private link to continue checkout or reopen your event pass after payment.</p>
        <p><a href="${appUrl}" style="display:inline-block;background:#ff2d95;color:#fff;padding:16px 22px;text-decoration:none;font-weight:700">Open in Model Escape →</a></p>
        <p><a href="${checkoutUrl}" style="color:#ff70ae">Continue in a browser</a></p>
        <p style="color:#777;font-size:12px">Do not forward this email. The link provides access to your guest event details.</p>
      </div>
    `,
  });
}

export async function sendAccountDeletionCode(email: string, name: string, code: string) {
 await transport.sendMail({from:process.env.EMAIL_FROM??"Model Escape <verify@modelescape.local>",to:email,subject:"Confirm your Model Escape account deletion",text:`Hello ${name},\n\nYour account deletion code is ${code}. It expires in 10 minutes. Enter it in Settings and type DELETE MY ACCOUNT to confirm. Download your files before confirming. If you did not request this, do not share or enter the code.`,html:`<p>Hello ${escapeHtml(name)},</p><p>Your account deletion code:</p><p><strong style="font-size:28px">${code}</strong></p><p>Expires in 10 minutes. Enter it in Settings and type <strong>DELETE MY ACCOUNT</strong> to confirm. Download your files first.</p><p>If you did not request this, do not share or enter the code.</p>`});
}
