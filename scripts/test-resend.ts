/**
 * Test script to verify Resend API configuration
 *
 * Usage: npx tsx scripts/test-resend.ts
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@drivemoreleads.co';

console.log('\n🔍 Resend API Test\n');
console.log('Configuration:');
console.log(
  `  API Key: ${RESEND_API_KEY ? '✓ Set (' + RESEND_API_KEY.substring(0, 10) + '...)' : '✗ Not set'}`
);
console.log(`  From Email: ${EMAIL_FROM}`);
console.log('');

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set!');
  console.error('   Please set it in your .env file or environment variables.');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('📧 Attempting to send test email...\n');

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: 'nicolasleroo@gmail.com', // Replace with your test email
      subject: 'Test Email from Bank Engagement Platform',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend configuration.</p>
        <p>If you receive this, your Resend setup is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('📬 Check your inbox at nicolasleroo@gmail.com');
    console.log('   (Check spam folder if not in inbox)');
  } catch (error) {
    console.error('❌ Failed to send email:');
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error details:', error);
    } else {
      console.error('   Unknown error:', error);
    }
    process.exit(1);
  }
}

testEmail();
