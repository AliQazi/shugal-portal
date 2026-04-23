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
          <p>Best regards,<br><strong>Shaheen Wings travel and tours (Pvt Ltd ) Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Shaheen Wings travel and tours (Pvt Ltd ). All rights reserved.</p>
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
        name: "Shaheen Wings travel and tours (Pvt Ltd )",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Password Reset Request - Shaheen Wings travel and tours (Pvt Ltd )",
      html: getPasswordResetEmailHTML(resetLink, userName),
      text: `Hello ${userName},\n\nWe received a request to reset your password.\n\nPlease click the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nShaheen Wings travel and tours (Pvt Ltd ) Team`,
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
          <h1>🎉 Welcome to Shaheen Wings travel and tours (Pvt Ltd )!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Welcome to Shaheen Wings travel and tours (Pvt Ltd )! Your agency account has been created successfully.</p>
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
          <p>Best regards,<br><strong>Shaheen Wings travel and tours (Pvt Ltd ) Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Shaheen Wings travel and tours (Pvt Ltd ). All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
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
        name: "Shaheen Wings travel and tours (Pvt Ltd )",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Your Agent Credentials - Shaheen Wings travel and tours (Pvt Ltd )",
      html: getCredentialsEmailHTML(
        agentCode,
        email,
        password,
        userName,
        companyName,
      ),
      text: `Hello ${userName},\n\nWelcome to Shaheen Wings travel and tours (Pvt Ltd )! Your agency account has been created successfully.\n\nCompany: ${companyName}\n\nYour Login Credentials:\nAgent Code: ${agentCode}\nEmail: ${email}\nPassword: ${password}\n\nLogin URL: ${process.env.FRONTEND_URL || "https://shaheenwingstravels.com"}/auth/login\n\nSecurity Tips:\n- Keep your credentials safe and secure\n- Do not share your password with anyone\n- We recommend changing your password after first login\n\nBest regards,\nShaheen Wings travel and tours (Pvt Ltd )`,
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
  testEmailConfiguration,
};
