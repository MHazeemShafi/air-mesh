
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const hashToken = token =>
  createHash('sha256').update(token).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Enter a valid email address.'
      });
    }

    const genericMessage =
      'If your verified subscription exists, a settings link will be sent to your email.';

    const { data: subscriber, error: subscriberError } =
      await supabase
        .from('email_subscribers')
        .select('id, email, is_verified, is_active')
        .ilike('email', email)
        .maybeSingle();

    if (subscriberError) throw subscriberError;

    if (
      !subscriber ||
      !subscriber.is_verified ||
      !subscriber.is_active
    ) {
      return res.status(200).json({
        message: genericMessage
      });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from('air_alert_preferences')
      .upsert(
        {
          subscriber_id: subscriber.id,
          management_token_hash: tokenHash,
          management_token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'subscriber_id'
        }
      );

    if (updateError) throw updateError;

    const appUrl = process.env.APP_URL;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (
      !appUrl ||
      !fromEmail ||
      !process.env.RESEND_API_KEY
    ) {
      throw new Error(
        'Email service configuration is incomplete.'
      );
    }

    // Must match the URL parameter read by App.jsx.
    const settingsUrl =
      `${appUrl.replace(/\/$/, '')}/?manageAlerts=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [subscriber.email],
      subject: 'Your AirMesh alert settings link',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#24352a;line-height:1.6">
          <h2 style="color:#315b3d">Manage your AirMesh alerts</h2>
          <p>You requested a secure link to manage your AirMesh notification preferences.</p>
          <p>
            <a href="${settingsUrl}"
              style="display:inline-block;background:#315b3d;color:white;padding:12px 20px;text-decoration:none;border-radius:6px">
              Manage alert settings
            </a>
          </p>
          <p>This link expires in 30 minutes.</p>
          <p>If you did not request this link, you can safely ignore this email.</p>
          <p style="color:#718075;font-size:12px">AirMesh · Breathe with awareness</p>
        </div>
      `,
      text: `Manage your AirMesh alert settings: ${settingsUrl}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.`
    });

    if (emailError) throw emailError;

    return res.status(200).json({
      message: genericMessage
    });

  } catch (error) {
    console.error('Request alert settings error:', error);

    return res.status(500).json({
      error:
        'Unable to send the settings link right now. Please try again later.'
    });
  }
}
