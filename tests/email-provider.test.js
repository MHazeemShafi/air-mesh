import test from 'node:test';
import assert from 'node:assert/strict';
import requestAlertSettings from '../api/request-alert-settings.js';

test('settings link requests are sent through Brevo', async () => {
  const env = {
    APP_URL: process.env.APP_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_FROM_EMAIL: process.env.BREVO_FROM_EMAIL
  };
  const originalFetch = globalThis.fetch;
  const emailRequests = [];

  Object.assign(process.env, {
    APP_URL: 'https://airmesh.example',
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    BREVO_API_KEY: 'test-brevo-key',
    BREVO_FROM_EMAIL: 'alerts@example.com'
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);

    if (url.hostname === 'supabase.test') {
      if (url.pathname.endsWith('/email_subscribers')) {
        return new Response(JSON.stringify({
          id: 'subscriber-1',
          email: 'person@example.com',
          is_verified: true,
          is_active: true
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      if (url.pathname.endsWith('/air_alert_preferences')) {
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected Supabase request: ${url.pathname}`);
    }

    if (url.hostname === 'api.brevo.com') {
      emailRequests.push({
        url: url.toString(),
        body: JSON.parse(init.body)
      });
      return new Response(JSON.stringify({ messageId: 'message-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      });
    }

    throw new Error(`Unexpected request: ${url.toString()}`);
  };

  try {
    const response = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    await requestAlertSettings({
      method: 'POST',
      headers: { 'x-forwarded-for': '192.0.2.10' },
      body: { email: 'person@example.com' }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(emailRequests.length, 1);
    assert.equal(emailRequests[0].url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(emailRequests[0].body.to[0].email, 'person@example.com');
    assert.equal(emailRequests[0].body.sender.email, 'alerts@example.com');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
