import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('email_subscribers')
      .select('id, is_verified, is_active')
      .ilike('email', email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing?.is_verified && existing?.is_active) {
      return res.status(200).json({
        message: 'This email is already subscribed.'
      });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const subscriberData = {
      email,
      is_active: true,
      is_verified: false,
      verification_token_hash: tokenHash,
      verification_expires_at: expiresAt
    };

    let saveResult;

    if (existing) {
      saveResult = await supabase
        .from('email_subscribers')
        .update(subscriberData)
        .eq('id', existing.id);
    } else {
      saveResult = await supabase
        .from('email_subscribers')
        .insert(subscriberData);
    }

    if (saveResult.error) throw saveResult.error;

    const appUrl = process.env.APP_URL?.replace(/\/+$/, '');
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!appUrl || !fromEmail) {
      throw new Error('APP_URL or RESEND_FROM_EMAIL is not configured.');
    }

    const verificationLink =
      `${appUrl}/api/verify-subscription?token=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Confirm your AirMesh email alerts',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Welcome to AirMesh</h2>
          <p>You requested email alerts about air quality in Mangaluru.</p>
          <p>Please confirm your email address using the link below:</p>
          <a href="${verificationLink}"
             style="display:inline-block;padding:12px 20px;background:#1677d2;color:white;text-decoration:none;border-radius:6px;">
             Confirm Email Subscription
          </a>
          <p>This link expires in 24 hours.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(502).json({
        error: 'Could not send the confirmation email. Please try again.'
      });
    }

    return res.status(200).json({
      message: 'Confirmation email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('Subscription error:', error);

    return res.status(500).json({
      error: 'Unable to process your subscription right now.'
    });
  }
}
