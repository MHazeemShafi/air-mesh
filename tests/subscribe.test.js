import test from 'node:test';
import assert from 'node:assert/strict';
import subscribe from '../api/subscribe.js';

test('active subscribers do not receive a distinguishable subscription response', async () => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const originalFetch = globalThis.fetch;
  const apiRequests = [];

  Object.assign(process.env, {
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    apiRequests.push(url.pathname);

    if (
      url.hostname === 'supabase.test' &&
      url.pathname.endsWith('/email_subscribers')
    ) {
      return new Response(JSON.stringify({
        id: 'subscriber-1',
        is_verified: true,
        is_active: true
      }), {
        status: 200,
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

    await subscribe({
      method: 'POST',
      headers: { 'x-forwarded-for': '192.0.2.11' },
      body: {
        email: 'person@example.com',
        preferences: {
          enabled: true,
          pollutants: ['pm25'],
          thresholds: {
            pm25: { value: 15, unit: 'µg/m³' }
          }
        }
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      message: 'If this address can be subscribed, a verification link will be sent.'
    });
    assert.deepEqual(apiRequests, ['/rest/v1/email_subscribers']);
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
