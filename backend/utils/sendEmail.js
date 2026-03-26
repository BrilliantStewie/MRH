import nodemailer from "nodemailer";

const EMAIL_USER = String(process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || "").trim();

const createFriendlyEmailError = (error) => {
  const combinedMessage = `${error?.message || ""} ${error?.response || ""}`;

  if (error?.code === "EAUTH" && /gmail|gsmtp|badcredentials/i.test(combinedMessage)) {
    return "Gmail rejected the login. Generate a new Google App Password for EMAIL_USER, update EMAIL_PASS in backend/.env, and restart the server.";
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    return "Email is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.";
  }

  return error?.message || "Unable to send email right now.";
};

const sendEmail = async (to, subject, htmlContent, plainText = "") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Enhanced Professional Wrapper
    const professionalHtml = `
      <div style="background-color: #f9fafb; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          
          <div style="background-color: #1A2B32; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; text-transform: uppercase;">
              Mercedarian Retreat House
            </h1>
          </div>

          <div style="padding: 40px 32px; line-height: 1.6; color: #374151;">
            ${htmlContent}
          </div>

          <div style="padding: 32px; background-color: #fdfdfd; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
              Security Notification
            </p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply directly to this email.
            </p>
            <p style="margin: 16px 0 0; font-size: 12px; color: #d1d5db;">
              &copy; ${new Date().getFullYear()} Mercedarian Retreat House. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Mercedarian Retreat House" <${EMAIL_USER}>`,
      to,
      subject,
      text: plainText, // Plain text version for spam filters/watchOS/accessibility
      html: professionalHtml,
    });

    console.log("Email sent: " + info.messageId);
    return { success: true };

  } catch (error) {
    const message = createFriendlyEmailError(error);
    console.error("Email error:", message);
    return { success: false, message, cause: error };
  }
};

export default sendEmail;
