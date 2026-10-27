import nodemailer from 'nodemailer';

export type EmailOtpType = 'SIGNUP' | 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD';

interface SendOtpOptions {
  to: string;
  otp: string;
  type: EmailOtpType;
  userName?: string;
}

export async function sendOtpEmail({
  to,
  otp,
  type,
  userName,
}: SendOtpOptions): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || '"Life Metric" <noreply@lifemetric.app>';

  const subjectTitles: Record<EmailOtpType, string> = {
    SIGNUP: 'Verify Your Email Address - Life Metric',
    FORGOT_PASSWORD: 'Reset Your Password - Life Metric',
    CHANGE_PASSWORD: 'Confirm Password Change - Life Metric',
  };

  const actionHeadings: Record<EmailOtpType, string> = {
    SIGNUP: 'Email Verification',
    FORGOT_PASSWORD: 'Password Reset Request',
    CHANGE_PASSWORD: 'Password Change Request',
  };

  const actionDescriptions: Record<EmailOtpType, string> = {
    SIGNUP: 'Thank you for joining Life Metric! Use the one-time verification code below to verify your email and activate your account.',
    FORGOT_PASSWORD: 'We received a request to reset your password. Use the one-time code below to proceed with setting a new password.',
    CHANGE_PASSWORD: 'A password change was initiated for your Life Metric account. Use the one-time code below to authorize this change.',
  };

  const subject = subjectTitles[type] || 'Your Verification Code - Life Metric';
  const heading = actionHeadings[type] || 'Verification Code';
  const description = actionDescriptions[type] || 'Your one-time verification code is provided below:';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f3f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0d12; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #141620; border: 1px solid #232736; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1f2330; background: linear-gradient(180deg, #181b28 0%, #141620 100%); text-align: center;">
                    <div style="display: inline-block; padding: 8px 16px; border-radius: 9999px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                      ⚡ Life Metric Security
                    </div>
                    <h1 style="margin: 16px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                      ${heading}
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px 32px;">
                    ${userName ? `<p style="margin: 0 0 14px 0; font-size: 15px; color: #cbd5e1;">Hello <strong>${userName}</strong>,</p>` : ''}
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                      ${description}
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background-color: #0c0d12; border: 1px solid #2b3042; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 600; display: block; margin-bottom: 8px;">
                        One-Time Passcode (OTP)
                      </span>
                      <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; text-shadow: 0 0 16px rgba(56, 189, 248, 0.25);">
                        ${otp}
                      </span>
                      <span style="display: block; margin-top: 10px; font-size: 12px; color: #f59e0b;">
                        ⏱ Valid for 10 minutes
                      </span>
                    </div>

                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      If you did not request this verification code, please ignore this email or check your account security. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0e1017; border-top: 1px solid #1a1d28; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #475569;">
                      Life Metric &bull; Behavioral Momentum & Gamified Habit Operating System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  console.log(`[LIFE METRIC OTP SERVICE] Dispatching ${type} verification code to ${to}...`);

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('[LIFE METRIC EMAIL ERROR] SMTP credentials not configured in environment variables.');
    return {
      success: false,
      error: 'Email service is not configured on the server. Please configure SMTP in your server environment.',
    };
  }

  try {
    const isGmail = smtpHost.toLowerCase().includes('gmail');
    const cleanPass = smtpPass.trim().replace(/\s+/g, '');

    const transporter = isGmail
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser.trim(),
            pass: cleanPass,
          },
        })
      : nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser.trim(),
            pass: smtpPass,
          },
        });

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`[LIFE METRIC OTP SERVICE] Email successfully delivered to ${to}`);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[LIFE METRIC EMAIL ERROR] Failed to send email via SMTP:', errorMsg);

    if (
      errorMsg.includes('Application-specific password required') ||
      errorMsg.includes('534-5.7.9') ||
      errorMsg.includes('InvalidSecondFactor')
    ) {
      return {
        success: false,
        error:
          'Gmail rejected the connection. A Google App Password is required instead of your regular password. Please generate one in your Google Account security settings.',
      };
    }

    return {
      success: false,
      error: `Failed to deliver email: ${errorMsg}`,
    };
  }
}
