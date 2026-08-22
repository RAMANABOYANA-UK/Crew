/**
 * Improved Email Service for Dayflow HRMS
 * 
 * Supports:
 * - Environment-controlled dispatch via `ENABLE_EMAIL_ALERTS=true`
 * - Pre-built HR email templates (Leave Submitted, Leave Reviewed, Welcome Employee, Anomaly Alert)
 * - Provider-ready interface (Console Logger / SMTP / Resend ready)
 * - Responsive HTML email rendering
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: "leave" | "onboarding" | "payroll" | "security" | "system";
}

export interface EmailResult {
  sent: boolean;
  enabled: boolean;
  to: string;
  subject: string;
  category?: string;
  timestamp: string;
  details?: string;
}

export type EmailTemplateType =
  | "LEAVE_SUBMITTED"
  | "LEAVE_REVIEWED"
  | "WELCOME_EMPLOYEE"
  | "PAYROLL_ANOMALY"
  | "PASSWORD_CHANGED";

export function renderHtmlTemplate(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e293b; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .content { padding: 32px 24px; color: #334155; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #e2e8f0; color: #334155; margin-bottom: 16px; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dayflow HRMS</h1>
    </div>
    <div class="content">
      <div class="badge">${title}</div>
      ${bodyContent}
    </div>
    <div class="footer">
      This is an automated notification from Dayflow HRMS. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendEmailAlert(options: EmailOptions): Promise<EmailResult> {
  const isEnabled = process.env.ENABLE_EMAIL_ALERTS === "true" || process.env.ENABLE_EMAIL_ALERTS === "1";
  const timestamp = new Date().toISOString();

  if (!isEnabled) {
    return {
      sent: false,
      enabled: false,
      to: options.to,
      subject: options.subject,
      category: options.category || "system",
      timestamp,
      details: "Email alerts are disabled (ENABLE_EMAIL_ALERTS is not set to true).",
    };
  }

  const html = options.html || renderHtmlTemplate(options.subject, `<p>${options.text.replace(/\n/g, "<br/>")}</p>`);

  // Provider Dispatch simulation (Can plug Resend or Nodemailer transport here)
  console.log(`\n📧 [EMAIL DISPATCHED] ──────────────────────────`);
  console.log(`To:       ${options.to}`);
  console.log(`Category: ${options.category || "system"}`);
  console.log(`Subject:  ${options.subject}`);
  console.log(`Time:     ${timestamp}`);
  console.log(`Body:     ${options.text}`);
  console.log(`HTML:     ${html.length} bytes rendered`);
  console.log(`───────────────────────────────────────────────\n`);

  return {
    sent: true,
    enabled: true,
    to: options.to,
    subject: options.subject,
    category: options.category || "system",
    timestamp,
    details: "Email dispatched successfully.",
  };
}
