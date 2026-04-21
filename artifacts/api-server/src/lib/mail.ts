import nodemailer from "nodemailer";

// Simple mailer configuration
// For development, we'll use a mock mailer or Ethereal
// In production, user should provide SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || "test@ethereal.email",
    pass: process.env.SMTP_PASS || "testpass",
  },
});

async function sendViaGAS(email: string, subject: string, html: string) {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url) throw new Error("GAS_WEBAPP_URL not configured");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ to: email, subject, html }),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GAS mailer failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to send email via GAS: ${response.statusText}`);
    }
    console.log(`Email sent successfully via GAS to ${email}`);
  } catch (error) {
    console.error("Error calling GAS mailer:", error);
    throw error;
  }
}

export async function sendOTP(email: string, otp: string) {
  const subject = "Your Login OTP";
  const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">FestFinder Login</h2>
        <p>Use the following OTP to sign in to your student dashboard:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #4338ca;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
        <p style="font-size: 12px; color: #999; margin-top: 40px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

  if (process.env.GAS_WEBAPP_URL) {
    return sendViaGAS(email, subject, html);
  }

  // If no SMTP configured and not using ethereal defaults, just log to console
  const options = transporter.options as any;
  if (!process.env.SMTP_HOST && options.host === "smtp.ethereal.email") {
    console.log(`[MAIL MOCK] Sending OTP ${otp} to ${email}`);
    return;
  }

  const mailOptions = {
    from: `"FestFinder" <${process.env.SMTP_USER || "noreply@festfinder.com"}>`,
    to: email,
    subject,
    text: `Your OTP for FestFinder login is: ${otp}. It will expire in 10 minutes.`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    if (options.host === "smtp.ethereal.email") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email");
  }
}

export async function sendRegistrationStatusEmail(email: string, eventTitle: string, status: "approved" | "rejected") {
  const subject = status === "approved" ? "You have been admitted!" : "Update on your registration";
  const statusColor = status === "approved" ? "#22c55e" : "#ef4444";
  const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: ${statusColor};">Registration ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <p>Your registration for the event <strong>${eventTitle}</strong> has been <strong>${status}</strong>.</p>
        ${status === "approved" ? '<p>Congratulations! We look forward to seeing you at the event.</p>' : '<p>Unfortunately, your application was not accepted at this time.</p>'}
        <p style="font-size: 12px; color: #999; margin-top: 40px;">FestFinder Team</p>
      </div>
    `;

  if (process.env.GAS_WEBAPP_URL) {
    return sendViaGAS(email, `FestFinder: ${subject}`, html).catch(err => console.error("GAS registration status email failed", err));
  }

  const options = transporter.options as any;
  if (!process.env.SMTP_HOST && options.host === "smtp.ethereal.email") {
    console.log(`[MAIL MOCK] Sending ${status} email to ${email} for event ${eventTitle}`);
    return;
  }

  const mailOptions = {
    from: `"FestFinder" <${process.env.SMTP_USER || "noreply@festfinder.com"}>`,
    to: email,
    subject: `FestFinder: ${subject}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Status email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

export async function sendCollegeApprovalEmail(email: string, collegeName: string) {
  const subject = "FestFinder: College Registration Approved";
  const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">Welcome to FestFinder</h2>
        <p>Congratulations! Your registration for <strong>${collegeName}</strong> has been fully approved by our super administrators.</p>
        <p>You can now log in to your admin dashboard and start hosting premier events for your institution.</p>
        <p style="font-size: 12px; color: #999; margin-top: 40px;">FestFinder Team</p>
      </div>
    `;

  if (process.env.GAS_WEBAPP_URL) {
    return sendViaGAS(email, subject, html).catch(err => console.error("GAS college approval email failed", err));
  }

  const options = transporter.options as any;
  if (!process.env.SMTP_HOST && options.host === "smtp.ethereal.email") {
    console.log(`[MAIL MOCK] Sending college approval email to ${email} for ${collegeName}`);
    return;
  }

  const mailOptions = {
    from: `"FestFinder" <${process.env.SMTP_USER || "noreply@festfinder.com"}>`,
    to: email,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Approval email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
