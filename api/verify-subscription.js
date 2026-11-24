import { createHash } from 'node:crypto';
import { getSupabase } from './_supabase.js';
import { checkRateLimit, getClientIp } from './_rate-limit.js';

function createPage(title, message, isSuccess = false) {
  const accentColor = isSuccess ? '#a5d7aa' : '#f5b4b6';
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title} · AirMesh</title>

        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #101914;
            color: #e7efe7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 16px;
            box-sizing: border-box;
          }

          main {
            max-width: 520px;
            width: 100%;
            margin: 24px;
            padding: 32px;
            background: #19261e;
            border: 1px solid #314438;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }

          h1 {
            color: ${accentColor};
            margin-top: 0;
            font-size: 24px;
          }

          p {
            line-height: 1.7;
            color: #c3d0c5;
            font-size: 15px;
          }

          a.return-btn {
            display: inline-block;
            margin-top: 12px;
            padding: 10px 20px;
            background: #245d3c;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background 0.2s;
          }
          a.return-btn:hover {
            background: #2e734b;
          }
        </style>
      </head>

      <body>
        <main>
          <h1>${title}</h1>
          <p>${message}</p>
          <p>
            <a href="${process.env.APP_URL || '/'}" class="return-btn">
              Return to AirMesh
            </a>
          </p>
        </main>
      </body>
    </html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`verify:${ip}`, 20, 60 * 1000)) {
    return res.status(429).send(createPage('Too Many Requests', 'Please wait a moment before trying again.', false));
  }

  try {
    const token = String(req.query?.token || '');

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).send(
        createPage(
          'Invalid link',
          'This verification link is invalid or malformed.',
          false
        )
      );
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const supabase = getSupabase();

    const { data: subscriber, error } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('verification_token_hash', tokenHash)
      .gt(
        'verification_expires_at',
        new Date().toISOString()
      )
      .eq('is_verified', false)
      .maybeSingle();

    if (error) throw error;

    if (!subscriber) {
      return res.status(400).send(
        createPage(
          'Link expired or already used',
          'This verification link has expired or has already been used. If you still need alerts, please subscribe again or request a settings link.',
          false
        )
      );
    }

    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        is_verified: true,
        is_active: true,
        verified_at: new Date().toISOString(),
        verification_token_hash: null,
        verification_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriber.id);

    if (updateError) throw updateError;

    return res.status(200).send(
      createPage(
        'Email verified',
        'Your AirMesh email address is now verified! Your daily air-quality notification preferences are activated. AirMesh will evaluate fresh CPCB readings each day and notify you only when your configured thresholds are exceeded.',
        true
      )
    );

  } catch (error) {
    console.error('AirMesh verification error:', error);

    return res.status(500).send(
      createPage(
        'Something went wrong',
        'We could not verify your subscription right now. Please try again later.',
        false
      )
    );
  }
}
