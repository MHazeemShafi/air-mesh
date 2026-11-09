
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
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

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
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

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
      throw new Error(
        'APP_URL or RESEND_FROM_EMAIL is not configured.'
      );
    }

    const verificationLink =
      `${appUrl}/api/verify-subscription?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your AirMesh subscription</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f0e7;font-family:Arial,Helvetica,sans-serif;color:#222820;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="background-color:#f4f0e7;padding:36px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:560px;background-color:#fbf9f3;border:1px solid #e7e3d8;">

          <!-- BRAND HEADER -->
          <tr>
            <td style="padding:30px 34px 24px;border-bottom:1px solid #e7e3d8;">

              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle"
                    style="width:42px;height:42px;background-color:#d5ad42;text-align:center;">

                    <span style="font-size:19px;font-weight:bold;color:#183d2c;">
                      ///
                    </span>

                  </td>

                  <td valign="middle" style="padding-left:12px;">
                    <div style="font-size:21px;font-weight:800;letter-spacing:1px;color:#183d2c;">
                      AIRMESH
                    </div>
                    <div style="font-size:10px;letter-spacing:2px;color:#777d70;margin-top:3px;">
                      AIR QUALITY MONITORING
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:38px 34px 34px;">

              <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#a18434;margin-bottom:16px;">
                EMAIL VERIFICATION
              </div>

              <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;font-weight:800;color:#183d2c;">
                Stay informed.<br>
                Breathe aware.
              </h1>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#51594f;">
                Thanks for signing up for AirMesh air quality alerts.
                We monitor air quality conditions and help you stay
                informed when pollution levels become unusual.
              </p>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#51594f;">
                Please confirm your email address to complete your subscription.
              </p>

              <!-- CONFIRMATION BUTTON -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" bgcolor="#183d2c"
                    style="border-radius:4px;">

                    <a href="${verificationLink}"
                      style="display:inline-block;padding:16px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:0.5px;">
                      CONFIRM MY EMAIL &nbsp; →
                    </a>

                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#777d70;">
                This confirmation link expires in 24 hours.
                If you did not request this subscription, you can safely
                ignore this email.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:22px 34px;background-color:#183d2c;">

              <div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#d5ad42;">
                AIRMESH
              </div>

              <p style="margin:9px 0 0;font-size:11px;line-height:1.7;color:#d4ddd3;">
                Understand the air around you.<br>
                Stay informed. Make better decisions.
              </p>

              <p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #42604c;font-size:10px;color:#b5c2b4;">
                Automated message from AirMesh. Please do not reply.
              </p>

            </td>
          </tr>

        </table>

        <p style="margin:18px 0 0;font-size:10px;color:#85897e;">
          © ${new Date().getFullYear()} AirMesh
        </p>

      </td>
    </tr>
  </table>

</body>
</html>
`;

    const text = `
AIRMESH — AIR QUALITY MONITORING

Stay informed. Breathe aware.

Thanks for signing up for AirMesh air quality alerts.

Please confirm your email address using this link:

${verificationLink}

This confirmation link expires in 24 hours.

If you did not request this subscription, you can ignore this email.

AirMesh
Understand the air around you.
`;

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Confirm your AirMesh email alerts',
      html,
      text
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
