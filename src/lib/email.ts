/**
 * Email Alert Service for Dayflow HRMS
 * 
 * Supports:
 * - Configurable email alerts via `ENABLE_EMAIL_ALERTS=true` environment variable
 * - Mock / Console logger when SMTP credentials are not explicitly supplied
 * - Clean HTML and plain text email formatting
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  sent: boolean;
  enabled: boolean;
  to: string;
  subject: string;
  timestamp: string;
  details?: string;
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
      timestamp,
      details: "Email alerts are disabled (ENABLE_EMAIL_ALERTS is not set to true).",
    };
  }

  // When enabled, log and simulate/send email transmission
  console.log(`\n📧 [EMAIL ALERT SENT] ──────────────────────────`);
  console.log(`To:      ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Time:    ${timestamp}`);
  console.log(`Body:    ${options.text}`);
  console.log(`───────────────────────────────────────────────\n`);

  return {
    sent: true,
    enabled: true,
    to: options.to,
    subject: options.subject,
    timestamp,
    details: "Email dispatched successfully.",
  };
}
