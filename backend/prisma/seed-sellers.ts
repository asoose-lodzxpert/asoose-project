/**
 * seed-sellers.ts
 * ---------------
 * One-shot onboarding script for raw Excel seller data.
 *
 * What it does:
 *   1. Reads raw_data/sellers.xlsx
 *   2. Skips vendors whose email already exists in the DB (no duplicates)
 *   3. Generates a unique, cryptographically-random temporary password per vendor
 *   4. Hashes the password with Argon2id (same settings as the main auth service)
 *   5. Creates a Vendor record (status: ACTIVE) with a placeholder store slug so
 *      the vendor can log in immediately and set up their store.
 *   6. Emails each new vendor via Resend:
 *      - Their temporary password
 *      - Link to download the Vendor app
 *      - Instructions to change their password on first login
 *      - Contact link if they have issues
 *   7. Prints a full summary at the end.
 *
 * Usage:
 *   npm run seed:sellers
 *
 * Requirements:
 *   - .env must have RESEND_API_KEY and DATABASE_URL set.
 *   - The sellers Excel file must be at: backend/raw_data/sellers.xlsx
 *   - Columns expected: Name | Email | Status | Earnings | State/Location
 */

import 'dotenv/config';
import * as path from 'path';
import * as crypto from 'crypto';
import * as xlsx from 'xlsx';
import * as argon2 from 'argon2';
import {
  PrismaClient,
  UserStatus,
  StoreType,
  StoreStatus,
  VerificationStatus,
} from '@prisma/client';
import { Resend } from 'resend';

// ── Config ──────────────────────────────────────────────────────────────────

const VENDOR_APP_DOWNLOAD_URL =
  'https://mega.nz/file/S2pwEZxS#9n4l61dZmIjsDUMOgX_9wDc8l8dae5cr-JdttGHndBo';
const CONTACT_URL = 'https://asoose.com/contact';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Asoose <hello@asoose.com>';

const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MB in KiB
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a secure temporary password: 6 alphanum chars + 2 uppercase + 2 digits + 1 symbol */
function generateTempPassword(): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // no l
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I O
  const digits = '23456789'; // no 0 1
  const symbols = '@#$%!';
  const all = lower + upper + digits + symbols;

  const pick = (charset: string, n: number) =>
    Array.from(
      { length: n },
      () => charset[crypto.randomInt(0, charset.length)],
    );

  const chars = [
    ...pick(lower, 4),
    ...pick(upper, 2),
    ...pick(digits, 2),
    ...pick(symbols, 1),
  ];

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip emoji / special chars
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/** Build the welcome email HTML for a new vendor. */
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

// ── Types ────────────────────────────────────────────────────────────────────

interface SellerRow {
  Name: string;
  Email: string;
  Status?: string;
  Earnings?: string | number;
  'State/Location'?: string;
}

interface Result {
  email: string;
  name: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('❌  RESEND_API_KEY is not set in .env');
    process.exit(1);
  }
  const resend = new Resend(resendApiKey);

  // 1. Read Excel
  const xlsxPath = path.join(__dirname, '..', 'raw_data', 'sellers.xlsx');
  const workbook = xlsx.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<SellerRow>(sheet);

  console.log(`\n📋  Loaded ${rows.length} rows from sellers.xlsx\n`);

  const results: Result[] = [];
  let created = 0;
  let skipped = 0;
  let emailFailed = 0;

  for (const row of rows) {
    const rawEmail = (row.Email ?? '').toString().trim().toLowerCase();
    const rawName = (row.Name ?? '').toString().trim();
    const location = (row['State/Location'] ?? '').toString().trim();

    // Basic validation
    if (!rawEmail || !rawEmail.includes('@')) {
      console.warn(`⚠️  Skipping row with invalid email: "${rawEmail}"`);
      results.push({
        email: rawEmail,
        name: rawName,
        status: 'error',
        reason: 'Invalid email',
      });
      continue;
    }
    if (!rawName) {
      console.warn(`⚠️  Skipping row with empty name for email: ${rawEmail}`);
      results.push({
        email: rawEmail,
        name: '',
        status: 'error',
        reason: 'Missing name',
      });
      continue;
    }

    // 2. Check for duplicate
    const existing = await prisma.vendor.findUnique({
      where: { email: rawEmail },
    });
    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${rawEmail}`);
      results.push({ email: rawEmail, name: rawName, status: 'skipped' });
      skipped++;
      continue;
    }

    // 3. Generate temp password & hash it (Argon2id)
    const tempPassword = generateTempPassword();
    const hashedPassword = await argon2.hash(tempPassword, ARGON2_OPTIONS);

    // 4. Build a unique store slug from vendor name
    let baseSlug = slugify(rawName) || `vendor-${Date.now()}`;
    let slug = baseSlug;
    let slugSuffix = 1;
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugSuffix++}`;
    }

    try {
      // 5. Create Vendor + Store in a transaction
      await prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.create({
          data: {
            email: rawEmail,
            name: rawName,
            password: hashedPassword,
            phone: '+2340000000000', // placeholder — vendor should update via app
            countryCode: 'NG',
            businessType: 'SME',
            employees: '1-10',
            status: UserStatus.ACTIVE,
          },
        });

        await tx.store.create({
          data: {
            vendorId: vendor.id,
            name: rawName,
            slug,
            type: StoreType.MARKET, // default; vendor can change in the app
            status: StoreStatus.ACTIVE,
            verification: VerificationStatus.VERIFIED,
            isOpen: true,
            commissionRate: 10.0,
            walletBalance: 0,
            description: location
              ? `Based in ${location}`
              : 'Welcome to Asoose!',
          },
        });
      });

      console.log(`✅  Created vendor: ${rawEmail}`);
      created++;

      // 6. Send welcome email
      try {
        const { error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: rawEmail,
          subject: 'Your Asoose Seller Account — Action Required',
          html: buildWelcomeEmail(rawName, tempPassword),
        });

        if (error) {
          console.warn(
            `   ⚠️  Email failed for ${rawEmail}: ${JSON.stringify(error)}`,
          );
          emailFailed++;
        } else {
          console.log(`   📧  Email sent to: ${rawEmail}`);
        }
      } catch (emailErr: any) {
        console.warn(`   ⚠️  Email error for ${rawEmail}: ${emailErr.message}`);
        emailFailed++;
      }

      results.push({ email: rawEmail, name: rawName, status: 'created' });
    } catch (dbErr: any) {
      console.error(`❌  DB error for ${rawEmail}: ${dbErr.message}`);
      results.push({
        email: rawEmail,
        name: rawName,
        status: 'error',
        reason: dbErr.message,
      });
    }

    // Brief pause to respect Resend rate limits (1 req/s on free tier)
    await new Promise((r) => setTimeout(r, 1200));
  }

  await prisma.$disconnect();

  // 7. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊  SEED SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total rows     : ${rows.length}`);
  console.log(`  ✅ Created     : ${created}`);
  console.log(`  ⏭️  Skipped     : ${skipped} (already in DB)`);
  console.log(`  ⚠️  Email fails : ${emailFailed}`);
  console.log(
    `  ❌ Errors      : ${results.filter((r) => r.status === 'error').length}`,
  );
  console.log('═'.repeat(60));

  const errors = results.filter((r) => r.status === 'error');
  if (errors.length) {
    console.log('\n🔴  Rows with errors:');
    errors.forEach((e) => console.log(`   • ${e.email} — ${e.reason}`));
  }

  console.log('\nDone! 🚀\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
