import { Resend } from 'resend';

let resendClient = null;

export function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;

    if (!key) {
      throw new Error('Resend API key missing: check RESEND_API_KEY.');
    }

    resendClient = new Resend(key);
  }

  return resendClient;
}
