import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSupabase } from './_supabase.js';
import { checkRateLimit, getClientIp } from './_rate-limit.js';

function renderPage(title, message, isSuccess = false) {
  const primaryColor = isSuccess ? '#2f6943' : '#b85458';
  const appUrl = process.env.APP_URL || '/';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · AirMesh</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #14283D;
      color: #E4EEF5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 16px;
      box-sizing: border-box;
    }
    main {
      max-width: 480px;
      width: 100%;
      padding: 32px;
      background: #1D3852;
      border: 1px solid #34536D;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    }
    h1 {
      margin-top: 0;
      color: ${primaryColor === '#2f6943' ? '#A3D9B5' : '#F5B4B6'};
      font-size: 22px;
    }
    p {
      line-height: 1.6;
      color: #A9BECE;
      font-size: 15px;
    }
    .btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 20px;
      background: #28618C;
      color: #FFFFFF;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #3476A8;
    }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${appUrl}" class="btn">Return to AirMesh</a>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`unsubscribe:${ip}`, 15, 60 * 1000)) {
    return res.status(429).send(renderPage('Too Many Requests', 'Please slow down and try again in a minute.', false));
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'airmesh-secret';

  // Support both GET (from one-click email links) and POST (from API)
  const id = req.method === 'GET' ? req.query?.id : req.body?.id;
  const sig = req.method === 'GET' ? req.query?.sig : req.body?.sig;

  if (!id || !sig) {
    if (req.method === 'POST') {
      return res.status(400).json({ error: 'Missing subscriber ID or signature.' });
    }
    return res.status(400).send(renderPage('Invalid Request', 'This unsubscribe link is incomplete or malformed.', false));
  }

  // Validate HMAC signature to prevent enumeration / unauthorized unsubscriptions
  const expectedSig = createHmac('sha256', secret).update(String(id)).digest('hex');

  const bufSupplied = Buffer.from(String(sig));
  const bufExpected = Buffer.from(expectedSig);

  if (bufSupplied.length !== bufExpected.length || !timingSafeEqual(bufSupplied, bufExpected)) {
    if (req.method === 'POST') {
      return res.status(403).json({ error: 'Invalid or forged unsubscribe signature.' });
    }
    return res.status(403).send(renderPage('Verification Failed', 'The security signature for this unsubscribe link is invalid.', false));
  }

  try {
    const supabase = getSupabase();

    // Deactivate subscriber
    const { error: subError } = await supabase
      .from('email_subscribers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (subError) throw subError;

    // Also disable alert preferences
    await supabase
      .from('air_alert_preferences')
      .update({
        enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('subscriber_id', id);

    if (req.method === 'POST') {
      return res.status(200).json({ message: 'You have been successfully unsubscribed from AirMesh alerts.' });
    }

    return res.status(200).send(renderPage(
      'Unsubscribed Successfully',
      'You have been unsubscribed from AirMesh daily air-quality notifications. You will no longer receive alert emails. You can re-subscribe anytime from the AirMesh app.',
      true
    ));
  } catch (error) {
    console.error('AirMesh unsubscribe error:', error);
    if (req.method === 'POST') {
      return res.status(500).json({ error: 'Unable to process unsubscribe request.' });
    }
    return res.status(500).send(renderPage('Something went wrong', 'We could not process your unsubscribe request right now. Please try again later.', false));
  }
}
