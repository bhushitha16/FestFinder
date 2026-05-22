import https from "https";

// Simple mailer configuration using Google Apps Script Web App

async function sendViaGAS(email: string, subject: string, html: string, text: string = "Please view this email in an HTML-compatible client.") {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url) throw new Error("GAS_WEBAPP_URL not configured in .env");

  return new Promise<void>((resolve, reject) => {
    try {
      const payload = JSON.stringify({ to: email, subject, html, text });
      
      const req = https.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      }, (res) => {
        // GAS Web Apps always return 200 or 302 if the script runs
        if (res.statusCode !== 200 && res.statusCode !== 302) {
          return reject(new Error(`GAS mailer HTTP error: ${res.statusCode}`));
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`Email sent successfully via GAS to ${email}. Status: ${res.statusCode}`);
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error("Error calling GAS mailer:", error);
        reject(error);
      });

      req.write(payload);
      req.end();
    } catch (error) {
      console.error("Error in sendViaGAS request setup:", error);
      reject(error);
    }
  });
}

export async function sendOTP(email: string, otp: string) {
  const subject = "Your Login OTP";
  const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">FestFinder Login</h2>
        <p>Use the following OTP to sign in to your dashboard:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #4338ca;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
        <p style="font-size: 12px; color: #999; margin-top: 40px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;
  const text = `Your OTP for FestFinder login is: ${otp}. It will expire in 10 minutes.`;

  return sendViaGAS(email, subject, html, text);
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
  const text = `Your registration for the event ${eventTitle} has been ${status}.`;

  return sendViaGAS(email, `FestFinder: ${subject}`, html, text).catch(err => console.error("GAS registration status email failed", err));
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
  const text = `Congratulations! Your registration for ${collegeName} has been fully approved by our super administrators.`;

  return sendViaGAS(email, subject, html, text).catch(err => console.error("GAS college approval email failed", err));
}
