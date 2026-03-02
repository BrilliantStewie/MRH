import nodemailer from "nodemailer";

const sendEmail = async (to, subject, htmlContent, plainText = "") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
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
      from: `"Mercedarian Retreat House" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: plainText, // Plain text version for spam filters/watchOS/accessibility
      html: professionalHtml,
    });

    console.log("Email sent: " + info.messageId);
    return { success: true };

  } catch (error) {
    console.error("Email error:", error);
    return { success: false, message: error.message };
  }
};

export default sendEmail;