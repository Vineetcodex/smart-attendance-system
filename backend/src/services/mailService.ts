import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export interface SendOtpResult {
  success: boolean;
  emailSent: boolean;
  messageId?: string;
  isDemoFallback?: boolean;
  error?: string;
}

export class MailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initializes and caches the Nodemailer transporter.
   */
  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    if (!config.smtpUser || !config.smtpPass) {
      return null;
    }

    try {
      if (config.smtpHost === 'smtp.gmail.com' || config.smtpUser.includes('@gmail.com')) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass.replace(/\s+/g, ''), // Supports Gmail 16-char App Passwords with or without spaces
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
          },
        });
      }
      return this.transporter;
    } catch (err) {
      console.warn('⚠️ Mail transporter initialization error:', err);
      return null;
    }
  }

  /**
   * Mask email for secure display (e.g., "john.doe@drptech.com" -> "j***e@drptech.com")
   */
  public static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'your registered email';
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Sends the 6-Digit Password Reset Verification OTP Code to the employee.
   */
  public static async sendPasswordResetOtp(
    toEmail: string,
    employeeName: string,
    employeeCode: string,
    otpCode: string
  ): Promise<SendOtpResult> {
    const transporter = this.getTransporter();
    const maskedEmail = this.maskEmail(toEmail);

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP - DRP Technology</title>
  <style>
    body { margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; max-width: 560px; margin: 30px auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #065f46 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }
    .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px; }
    .title { margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 15px; color: #cbd5e1; margin-bottom: 16px; line-height: 1.6; }
    .otp-card { background: #020617; border: 2px dashed #059669; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 0; padding-left: 8px; }
    .otp-expiry { font-size: 12px; color: #fbbf24; margin-top: 8px; font-weight: 500; }
    .info-list { background-color: #1e293b; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 12px; color: #94a3b8; }
    .info-item { margin: 4px 0; }
    .info-item strong { color: #e2e8f0; }
    .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-left: 3px solid #f59e0b; padding-left: 12px; margin-top: 24px; }
    .footer { background-color: #020617; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">DRP Technology Security</div>
      <h1 class="title">Password Reset Verification</h1>
    </div>
    <div class="body">
      <p class="greeting">
        Hello <strong>${employeeName}</strong> (<code>${employeeCode}</code>),
      </p>
      <p class="greeting">
        We received a request to reset the password for your employee attendance account. Use the one-time verification code below to authorize this password change.
      </p>

      <div class="otp-card">
        <div class="otp-label">Your One-Time Password (OTP)</div>
        <div class="otp-code">${otpCode}</div>
        <div class="otp-expiry">⏱️ Valid for 10 minutes only</div>
      </div>

      <div class="info-list">
        <div class="info-item"><strong>Employee ID:</strong> ${employeeCode}</div>
        <div class="info-item"><strong>Account Email:</strong> ${maskedEmail}</div>
        <div class="info-item"><strong>Requested At:</strong> ${new Date().toUTCString()}</div>
      </div>

      <p class="warning">
        🔒 <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or notify your office administrator immediately. Never share this code with anyone.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} DRP Technology — QR & Facial Biometric Attendance System.<br>
      This is an automated security transmission. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
    `;

    // 1. If SMTP is configured, attempt real email transmission
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: config.smtpFrom,
          to: toEmail,
          subject: `🔐 ${otpCode} is your DRP Technology password reset code`,
          text: `Hello ${employeeName},\n\nYour one-time password (OTP) to reset your DRP Technology attendance password is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please notify your office administrator.`,
          html: htmlContent,
        });

        console.log(`✉️ [MailService] Password reset OTP sent to ${toEmail} (MessageId: ${info.messageId})`);
        return {
          success: true,
          emailSent: true,
          messageId: info.messageId,
          isDemoFallback: false,
        };
      } catch (sendErr: any) {
        console.warn(`⚠️ [MailService] SMTP email delivery failed for ${toEmail}:`, sendErr?.message || sendErr);
        // Fall through to console logging & demo fallback
      }
    }

    // 2. Fallback mode (Console Log & Demo Helper)
    console.log(`================================================================`);
    console.log(`📧 [MailService DEMO / CONSOLE FALLBACK]`);
    console.log(`To:          ${toEmail} (${employeeName} - ${employeeCode})`);
    console.log(`Subject:     🔐 ${otpCode} is your DRP Technology password reset code`);
    console.log(`OTP Code:    >>> ${otpCode} <<< (Expires in 10 minutes)`);
    console.log(`Note:        Configure SMTP_USER and SMTP_PASS in backend/.env to send real Gmail emails.`);
    console.log(`================================================================`);

    return {
      success: true,
      emailSent: false,
      isDemoFallback: true,
    };
  }
}
