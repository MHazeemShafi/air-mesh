
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const token = String(req.query?.token || '');

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send('Invalid verification link.');
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const { data: subscriber, error: lookupError } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('verification_token_hash', tokenHash)
      .gt('verification_expires_at', new Date().toISOString())
      .eq('is_verified', false)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!subscriber) {
      return res.status(400).send(
        'This verification link is invalid or has expired. Please subscribe again.'
      );
    }

    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        is_verified: true,
        is_active: true,
        verified_at: new Date().toISOString(),
        verification_token_hash: null,
        verification_expires_at: null
      })
      .eq('id', subscriber.id);

    if (updateError) throw updateError;

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AirMesh Subscription Confirmed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:50px 20px;">
          <h1>Subscription confirmed!</h1>
          <p>Your AirMesh email alerts are now activated.</p>
          <p>You will receive alerts when the monitored air-quality risk increases.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).send('Unable to verify your subscription. Please try again.');
  }
}
