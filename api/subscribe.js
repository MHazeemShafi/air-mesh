import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { sendBrevoEmail } from './_lib/send-brevo.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


const ALLOWED_POLLUTANTS = [
  'pm25', 'pm10', 'o3', 'no2',
  'so2', 'co', 'no', 'nox'
];

const DEFAULT_THRESHOLDS = {
  pm25: {
    value: 15,
    unit: 'µg/m³'
  }
};

function cleanPreferences(input = {}) {
  const profile = [
    'general',
    'respiratory_sensitive',
    'custom'
  ].includes(input.profile)
    ? input.profile
    : 'respiratory_sensitive';

  const pollutants = Array.isArray(input.pollutants)
    ? [...new Set(
        input.pollutants.filter(p =>
          ALLOWED_POLLUTANTS.includes(p)
        )
      )]
    : ['pm25'];

  const thresholds = {};

  for (const pollutant of pollutants) {
    const threshold =
      input.thresholds?.[pollutant] ||
      (pollutant === 'pm25'
        ? DEFAULT_THRESHOLDS.pm25
        : null);

    if (
      threshold &&
      Number.isFinite(Number(threshold.value)) &&
      Number(threshold.value) > 0 &&
      typeof threshold.unit === 'string'
    ) {
      thresholds[pollutant] = {
        value: Number(threshold.value),
        unit: threshold.unit
      };
    }
  }

  return {
    profile,
    enabled: input.enabled === true,
    pollutants,
    thresholds
  };
}

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

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return res.status(400).json({
        error: 'Enter a valid email address.'
      });
    }

    const preferences = cleanPreferences(
      req.body?.preferences
    );

    const { data: existing, error: lookupError } =
      await supabase
        .from('email_subscribers')
        .select('id,is_verified,is_active')
        .ilike('email', email)
        .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing?.is_verified && existing?.is_active) {
      return res.status(409).json({
        alreadySubscribed: true,
        error:
          'This email is already subscribed. Request a secure settings link to change your preferences.'
      });
    }

    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const expiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    let subscriberId;

    if (existing) {
      const { data, error } = await supabase
        .from('email_subscribers')
        .update({
          email,
          is_active: true,
          is_verified: false,
          verification_token_hash: tokenHash,
          verification_expires_at: expiry
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;

      subscriberId = data.id;
    } else {
      const { data, error } = await supabase
        .from('email_subscribers')
        .insert({
          email,
          is_active: true,
          is_verified: false,
          verification_token_hash: tokenHash,
          verification_expires_at: expiry
        })
        .select('id')
        .single();

      if (error) throw error;

      subscriberId = data.id;
    }

    const { error: preferenceError } = await supabase
      .from('air_alert_preferences')
      .upsert({
        subscriber_id: subscriberId,
        profile: preferences.profile,
        enabled: preferences.enabled,
        pollutants: preferences.pollutants,
        thresholds: preferences.thresholds,
        frequency: 'important',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'subscriber_id'
      });

    if (preferenceError) throw preferenceError;

    if (!process.env.APP_URL) {
      throw new Error('APP_URL is not configured.');
    }

    const verificationUrl =
      `${process.env.APP_URL.replace(/\/$/, '')}` +
      `/api/verify-subscription?token=${token}`;

    await sendBrevoEmail({
      to: email,
      subject: 'Confirm your AirMesh email alerts',
      htmlContent: `
        <div style="
          font-family:Arial,sans-serif;
          max-width:560px;
          margin:auto;
          color:#17231b;
          line-height:1.6
        ">
          <h2>Confirm your AirMesh subscription</h2>
          <p>
            Confirm your email address to activate
            the notification preferences you selected.
          </p>
          <p>
            <a href="${verificationUrl}" style="
              display:inline-block;
              background:#245d3c;
              color:white;
              padding:12px 18px;
              border-radius:6px;
              text-decoration:none
            ">Verify email</a>
          </p>
          <p>
            This link expires in 24 hours.
            Ignore this email if you did not request it.
          </p>
        </div>
      `
    });

    return res.status(200).json({
      message:
        'Check your inbox for a verification link. Your selected preferences activate after verification.'
    });

  } catch (error) {
    console.error('AirMesh subscribe error:', error);

    return res.status(500).json({
      error:
        'Could not start your subscription. Please try again later.'
    });
  }
}
