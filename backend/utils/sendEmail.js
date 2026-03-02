import nodemailer from "nodemailer";

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
      },
    });

    // We create a standard wrapper so all emails (OTP or Reset) look consistent
    const professionalHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a1a1a; text-align: center;">Mercedarian Retreat House</h2>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <div style="padding: 20px 0;">
          ${htmlContent}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888; text-align: center;">
          This is an automated security email. Please do not reply.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Mercedarian Retreat House" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: professionalHtml,
    });

    console.log("Email sent: " + info.messageId);
    return { success: true }; // ✅ Return success to the controller

  } catch (error) {
    console.error("Email error:", error);
    return { success: false, message: error.message }; // ❌ Return error to the controller
  }
};

export default sendEmail;