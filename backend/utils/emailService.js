import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create transporter configuration based on email service
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  let transportConfig;

  if (emailService === "gmail") {
    // Gmail configuration
    transportConfig = {
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Additional Gmail-specific settings
      tls: {
        rejectUnauthorized: false, // For development, set to true in production
        ciphers: "SSLv3",
      },
      pool: true, // Use connection pool
      maxConnections: 5,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 5,
    };
  } else {
    // Custom SMTP configuration
    transportConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // For development
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
    };
  }

  console.log("📧 Email Configuration:", {
    service: emailService,
    user: process.env.EMAIL_USER,
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
  });

  return nodemailer.createTransport(transportConfig);
};

// Create persistent transporter
const transporter = createTransporter();

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error.message);
    console.error("Please check your email configuration in .env file");
    console.error("For Gmail, make sure you are using an App Password");
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Email templates
const getPasswordResetEmailHTML = (resetLink, userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #2A166D;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #3a1c9a;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;  
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2A166D;">${resetLink}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0;">
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password won't change until you access the link above</li>
            </ul>
          </div>
          <p>If you have any questions or concerns, please contact our support team.</p>
          <p>Best regards,<br><strong>Shaheen Wings Travel and Tours Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Shaheen Wings travel and tours. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email,
  resetToken,
  userId,
  userName,
) => {
  try {
    console.log(`📤 Attempting to send password reset email to: ${email}`);

    // Construct reset link
    const frontendURL =
      process.env.FRONTEND_URL || "https://shaheenwingstravels.com";
    const resetLink = `${frontendURL}/auth/forgot-password?token=${resetToken}&userId=${userId}`;

    const mailOptions = {
      from: {
        name: "Shaheen Wings travel and tours",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Password Reset Request - Shaheen Wings travel and tours",
      html: getPasswordResetEmailHTML(resetLink, userName),
      text: `Hello ${userName},\n\nWe received a request to reset your password.\n\nPlease click the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nShaheen Wings travel and tours | Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending password reset email:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Email template for sending credentials
const getCredentialsEmailHTML = (
  agentCode,
  email,
  password,
  userName,
  companyName,
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Agent Credentials</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .credentials-box {
          background-color: #f8f9fa;
          border: 2px solid #2A166D;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
          padding: 10px;
          background-color: #ffffff;
          border-radius: 4px;
        }
        .credential-label {
          font-weight: bold;
          color: #2A166D;
          font-size: 14px;
        }
        .credential-value {
          font-size: 16px;
          color: #333;
          font-family: 'Courier New', monospace;
          margin-top: 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #2A166D;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #3a1c9a;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Shaheen Wings Travel and Tours!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Welcome to Shaheen Wings travel and tours! Your agency account has been created successfully.</p>
          <p><strong>Company:</strong> ${companyName}</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #2A166D;">Your Login Credentials</h3>
            
            <div class="credential-item">
              <div class="credential-label">Agent Code:</div>
              <div class="credential-value">${agentCode}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${email}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Password:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || "https://shaheenwingstravels.com"}/auth/login" class="button">Login to Your Account</a>
          </div>

          <div class="warning">
            <strong>🔒 Security Tips:</strong>
            <ul style="margin: 10px 0;">
              <li>Keep your credentials safe and secure</li>
              <li>Do not share your password with anyone</li>
              <li>We recommend changing your password after first login</li>
              <li>If you didn't request this account, please contact us immediately</li>
            </ul>
          </div>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br><strong>Shaheen Wings travel and tours | Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Shaheen Wings travel and tours. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Internal template: notify Shaheen Wings Gmail when a new agent is registered
const getAgentRegistrationNotificationHTML = (payload) => {
  const {
    name,
    email,
    phone,
    companyName,
    city,
    address,
    agencyCode,
    password,
    registeredAt,
  } = payload;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Agent Registration Alert</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; color: #222; }
        .container { max-width: 680px; margin: 24px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%); color: #fff; padding: 22px; }
        .header h1 { margin: 0; font-size: 22px; }
        .content { padding: 24px; }
        .meta { background: #f8f9ff; border: 1px solid #dfe3ff; border-radius: 8px; padding: 16px; }
        .row { display: flex; gap: 8px; margin: 8px 0; }
        .label { width: 170px; font-weight: 700; color: #2A166D; }
        .value { flex: 1; word-break: break-word; }
        .warn { margin-top: 18px; background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; }
        .footer { padding: 14px 24px 22px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Agent Registered</h1>
        </div>
        <div class="content">
          <p>A new agent account has been created. Registration details are below:</p>
          <div class="meta">
            <div class="row"><div class="label">Agent Name:</div><div class="value">${name || "N/A"}</div></div>
            <div class="row"><div class="label">Company Name:</div><div class="value">${companyName || "N/A"}</div></div>
            <div class="row"><div class="label">Agent Code:</div><div class="value">${agencyCode || "N/A"}</div></div>
            <div class="row"><div class="label">Email:</div><div class="value">${email || "N/A"}</div></div>
            <div class="row"><div class="label">Phone:</div><div class="value">${phone || "N/A"}</div></div>
            <div class="row"><div class="label">City:</div><div class="value">${city || "N/A"}</div></div>
            <div class="row"><div class="label">Address:</div><div class="value">${address || "N/A"}</div></div>
            <div class="row"><div class="label">Generated Password:</div><div class="value">${password || "N/A"}</div></div>
            <div class="row"><div class="label">Registered At:</div><div class="value">${registeredAt || new Date().toISOString()}</div></div>
          </div>
          <div class="warn">
            <strong>Security Notice:</strong> This email contains agent credentials. Keep it confidential.
          </div>
        </div>
        <div class="footer">
          This is an automated alert from Shaheen Wings travel and tours.
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send credentials email to agent
export const sendCredentialsEmail = async (
  email,
  agentCode,
  password,
  userName,
  companyName,
) => {
  try {
    console.log(`📤 Attempting to send credentials email to: ${email}`);
    console.log(
      `Agent: ${userName}, Code: ${agentCode}, Company: ${companyName}`,
    );

    // Validate inputs
    if (!email || !agentCode || !password || !userName) {
      throw new Error(
        "Missing required parameters: email, agentCode, password, or userName",
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    const mailOptions = {
      from: {
        name: "Shaheen Wings travel and tours",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Your Agent Credentials - Shaheen Wings travel and tours",
      html: getCredentialsEmailHTML(
        agentCode,
        email,
        password,
        userName,
        companyName,
      ),
      text: `Hello ${userName},\n\nWelcome to Shaheen Wings travel and tours! Your agency account has been created successfully.\n\nCompany: ${companyName}\n\nYour Login Credentials:\nAgent Code: ${agentCode}\nEmail: ${email}\nPassword: ${password}\n\nLogin URL: ${process.env.FRONTEND_URL || "https://shaheenwingstravels.com"}/auth/login\n\nSecurity Tips:\n- Keep your credentials safe and secure\n- Do not share your password with anyone\n- We recommend changing your password after first login\n\nBest regards,\nShaheen Wings travel and tours`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Credentials email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    if (info.rejected && info.rejected.length > 0) {
      throw new Error(
        `Email was rejected by the server for: ${info.rejected.join(", ")}`,
      );
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending credentials email:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Failed to send credentials email: ${error.message}`);
  }
};

// Send new agent registration details to internal Shaheen Wings Gmail
export const sendAgentRegistrationNotificationEmail = async (payload) => {
  try {
    const adminEmail =
      process.env.SHAHEENWINGS_GMAIL ||
      process.env.INTERNAL_ALERT_EMAIL ||
      process.env.EMAIL_USER;

    if (!adminEmail) {
      throw new Error("Internal alert email is not configured");
    }

    const mailOptions = {
      from: {
        name: "Shaheen Wings travel and tours",
        address: process.env.EMAIL_USER,
      },
      to: adminEmail,
      subject: `New Agent Registered - ${payload?.name || "Unknown"} (${payload?.agencyCode || "N/A"})`,
      html: getAgentRegistrationNotificationHTML(payload || {}),
      text: `New Agent Registered\n\nName: ${payload?.name || "N/A"}\nCompany: ${payload?.companyName || "N/A"}\nAgent Code: ${payload?.agencyCode || "N/A"}\nEmail: ${payload?.email || "N/A"}\nPhone: ${payload?.phone || "N/A"}\nCity: ${payload?.city || "N/A"}\nAddress: ${payload?.address || "N/A"}\nPassword: ${payload?.password || "N/A"}\nRegistered At: ${payload?.registeredAt || new Date().toISOString()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Agent registration notification sent to internal email", {
      to: adminEmail,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending agent registration notification:", error.message);
    throw new Error(`Failed to send agent registration notification: ${error.message}`);
  }
};

const getBookingNotificationHTML = ({
  bookingType,
  bookingReference,
  bookingNumber,
  pnr,
  sector,
  packageName,
  groupId,
  source,
  status,
  totalPassengers,
  totalAmount,
  agentName,
  agentEmail,
  agencyCode,
  companyName,
  createdAt,
}) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Booking Notification</title>
        <style>
          body { font-family: Arial, sans-serif; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 24px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .header { background: #1f4c94; color: #fff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { padding: 24px; }
          .row { margin-bottom: 14px; }
          .label { font-weight: 700; color: #1f4c94; margin-bottom: 6px; display: block; }
          .value { padding: 12px 14px; background: #f8f9ff; border-radius: 6px; }
          .footer { padding: 18px 24px; color: #777; font-size: 13px; background: #f3f6ff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New ${bookingType} Booking Created</h1>
          </div>
          <div class="content">
            <div class="row"><span class="label">Reference</span><div class="value">${bookingReference || bookingNumber || groupId || "N/A"}</div></div>
            <div class="row"><span class="label">PNR / Package</span><div class="value">${pnr || packageName || "N/A"}</div></div>
            <div class="row"><span class="label">Sector / Source</span><div class="value">${sector || source || "N/A"}</div></div>
            <div class="row"><span class="label">Status</span><div class="value">${status || "N/A"}</div></div>
            <div class="row"><span class="label">Passengers</span><div class="value">${totalPassengers || 0}</div></div>
            <div class="row"><span class="label">Total Amount</span><div class="value">${totalAmount ? `PKR ${Number(totalAmount).toLocaleString()}` : "N/A"}</div></div>
            <hr />
            <div class="row"><span class="label">Agent / Agency</span><div class="value">${agentName || "N/A"}${companyName ? ` (${companyName})` : ""}</div></div>
            <div class="row"><span class="label">Agent Email</span><div class="value">${agentEmail || "N/A"}</div></div>
            <div class="row"><span class="label">Agent Code</span><div class="value">${agencyCode || "N/A"}</div></div>
            <div class="row"><span class="label">Created At</span><div class="value">${createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString()}</div></div>
          </div>
          <div class="footer">This is an automated booking notification from Shaheen Wings Travel and Tours.</div>
        </div>
      </body>
    </html>
  `;
};

export const sendBookingNotificationEmail = async ({ bookingType, booking, agent }) => {
  try {
    const recipients = [
      process.env.EMAIL_USER,
      process.env.ADMIN_EMAIL,
      process.env.INTERNAL_ALERT_EMAIL,
      process.env.SHAHEENWINGS_GMAIL,
    ]
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    const uniqueRecipients = [...new Set(recipients)];

    if (!uniqueRecipients.length) {
      throw new Error("EMAIL_USER is not configured in environment variables");
    }

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "Shaheen Wings travel and tours",
        address: process.env.EMAIL_USER,
      },
      to: uniqueRecipients,
      subject: `New ${bookingType} Booking: ${booking.bookingReference || booking.bookingNumber || booking._id}`,
      html: getBookingNotificationHTML({
        bookingType,
        bookingReference: booking.bookingReference,
        bookingNumber: booking.bookingNumber,
        pnr: booking.pnr,
        sector: booking.sector,
        packageName: booking.packageName,
        groupId: booking.groupId,
        source: booking.source,
        status: booking.status,
        totalPassengers: (booking.adultsCount || 0) + (booking.childrenCount || 0) + (booking.infantsCount || 0),
        totalAmount: booking.pricing?.grandTotal || booking.pricing?.totalAmount || 0,
        agentName: agent?.name || agent?.email || "Agent",
        agentEmail: agent?.email || "N/A",
        agencyCode: agent?.agencyCode || "N/A",
        companyName: agent?.companyName || "N/A",
        createdAt: booking.createdAt,
      }),
      text: `A new ${bookingType} booking was created.

Reference: ${booking.bookingReference || booking.bookingNumber || booking._id}
PNR / Package: ${booking.pnr || booking.packageName || "N/A"}
Sector / Source: ${booking.sector || booking.source || "N/A"}
Status: ${booking.status}
Passengers: ${(booking.adultsCount || 0) + (booking.childrenCount || 0) + (booking.infantsCount || 0)}
Total Amount: ${booking.pricing?.grandTotal || booking.pricing?.totalAmount || 0}
Agent: ${agent?.name || "Agent"}
Agent Email: ${agent?.email || "N/A"}
Agency Code: ${agent?.agencyCode || "N/A"}
Company: ${agent?.companyName || "N/A"}
Created At: ${booking.createdAt || new Date().toISOString()}
`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Booking notification email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending booking notification email:", error.message);
    throw error;
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email configuration is valid");
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    console.error("❌ Email configuration error:", error);
    return { success: false, error: error.message };
  }
};

export default {
  sendPasswordResetEmail,
  sendCredentialsEmail,
  sendAgentRegistrationNotificationEmail,
  sendBookingNotificationEmail,
  testEmailConfiguration,
};
