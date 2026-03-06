/**
 * test-seller-email.ts
 * --------------------
 * Sends a sample vendor welcome email to a test inbox using the
 * existing SMTP credentials in .env — no database interaction.
 *
 * Usage:
 *   npx tsx prisma/test-seller-email.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import * as nodemailer from 'nodemailer';

const TEST_RECIPIENT = 'arhyelphilip024@gmail.com';
const SAMPLE_NAME = "Binta's Empire";
const SAMPLE_PASSWORD = 'Abc@2345';

const VENDOR_APP_DOWNLOAD_URL =
  'https://mega.nz/file/S2pwEZxS#9n4l61dZmIjsDUMOgX_9wDc8l8dae5cr-JdttGHndBo';
const CONTACT_URL = 'https://asoose.com/contact';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Asoose <hello@asoose.com>';

function buildWelcomeEmail(vendorName: string, tempPassword: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Asoose</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Welcome to Asoose</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Your seller account has been created</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;">Dear <strong>${vendorName}</strong>,</p>

              <!-- Hiive → Asoose notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;color:#1e40af;font-size:14px;line-height:1.7;">
                    <strong>Important Notice — Platform Update</strong><br/>
                    We have rebranded from <strong>Hiive</strong> to <strong>Asoose</strong>. All your seller
                    activity, history, and earnings have been migrated to the new platform. Going forward,
                    please use the Asoose Vendor App to manage your store.
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Your vendor account is now active on Asoose. Please find your temporary login credentials
                below. For security reasons, you are required to change your password upon first login.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3ec;border:1px solid #fed7aa;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;color:#9a3412;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Login Credentials</p>
                    <p style="margin:0 0 10px;color:#1f2937;font-size:15px;">
                      <span style="color:#6b7280;">Temporary Password:</span>
                      &nbsp;<strong style="font-family:'Courier New',monospace;font-size:17px;color:#ea580c;background:#fff;padding:2px 10px;border-radius:4px;border:1px solid #fed7aa;">${tempPassword}</strong>
                    </p>
                    <p style="margin:0;color:#9a3412;font-size:13px;">Please change this password immediately after your first login.</p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:600;">Getting Started</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:0 0 14px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:30px;height:30px;background:#f97316;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-weight:700;font-size:14px;">1</span>
                        </td>
                        <td style="padding-left:14px;color:#374151;font-size:15px;vertical-align:middle;">
                          Download the <strong>Asoose Vendor App</strong> using the button below.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 14px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:30px;height:30px;background:#f97316;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-weight:700;font-size:14px;">2</span>
                        </td>
                        <td style="padding-left:14px;color:#374151;font-size:15px;vertical-align:middle;">
                          Sign in with your registered email address and the temporary password above.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:30px;height:30px;background:#f97316;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-weight:700;font-size:14px;">3</span>
                        </td>
                        <td style="padding-left:14px;color:#374151;font-size:15px;vertical-align:middle;">
                          Navigate to <strong>Account &rsaquo; Change Password</strong> and set a new secure password before managing your store.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Download Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${VENDOR_APP_DOWNLOAD_URL}" target="_blank"
                      style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;
                             font-size:15px;font-weight:600;padding:14px 40px;border-radius:6px;
                             letter-spacing:0.3px;">
                      Download Vendor App
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:8px;">
                <tr>
                  <td style="padding:18px 22px;color:#6b7280;font-size:14px;line-height:1.7;">
                    If you experience any difficulties accessing your account or have questions about
                    the platform migration, please do not hesitate to contact our support team at
                    <a href="${CONTACT_URL}" style="color:#f97316;text-decoration:none;font-weight:600;">${CONTACT_URL}</a>.
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                Thank you for being a valued seller on our platform. We look forward to supporting your
                business on Asoose.
              </p>
              <p style="margin:16px 0 0;color:#374151;font-size:14px;">
                Regards,<br/>
                <strong>The Asoose Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                &copy; ${new Date().getFullYear()} Asoose. All rights reserved.<br/>
                This message was sent to you because your seller account has been migrated to the Asoose platform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function main() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? '465', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    console.error(
      'Missing SMTP config. Ensure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD are set in .env',
    );
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log('Verifying SMTP connection...');
  await transporter.verify();
  console.log('SMTP connection OK.');

  console.log(`Sending test email to ${TEST_RECIPIENT}...`);
  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to: TEST_RECIPIENT,
    subject: '[TEST] Your Asoose Seller Account — Action Required',
    html: buildWelcomeEmail(SAMPLE_NAME, SAMPLE_PASSWORD),
  });

  console.log(`Email sent. Message ID: ${info.messageId}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
