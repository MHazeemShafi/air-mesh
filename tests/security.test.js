import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  authenticateCron,
  generateUnsubscribeSignature
} from '../api/daily-respiratory-alerts.js';

test('Security & Sanitization', async (t) => {
  await t.test('escapeHtml prevents XSS injection', () => {
    const malicious = '<script>alert("xss")</script>&"\'';
    const escaped = escapeHtml(malicious);
    assert.ok(!escaped.includes('<script>'), 'Raw script tags should be escaped');
    assert.equal(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#39;');
  });

  await t.test('authenticateCron authenticates valid Bearer token timing-safely', () => {
    const originalSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = 'super-secret-test-token-123456';

      const validReq = {
        headers: {
          authorization: 'Bearer super-secret-test-token-123456'
        }
      };
      assert.equal(authenticateCron(validReq), true, 'Valid Bearer token should authenticate');

      const invalidReq = {
        headers: {
          authorization: 'Bearer wrong-token'
        }
      };
      assert.equal(authenticateCron(invalidReq), false, 'Wrong token should be rejected');

      const noHeaderReq = {
        headers: {}
      };
      assert.equal(authenticateCron(noHeaderReq), false, 'Missing header should be rejected');
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  await t.test('generateUnsubscribeSignature produces deterministic HMAC', () => {
    const sig1 = generateUnsubscribeSignature('sub-123');
    const sig2 = generateUnsubscribeSignature('sub-123');
    const sig3 = generateUnsubscribeSignature('sub-456');

    assert.equal(sig1, sig2, 'Signatures for the same ID must match');
    assert.notEqual(sig1, sig3, 'Signatures for different IDs must differ');
    assert.equal(sig1.length, 64, 'HMAC-SHA256 hex signature should be 64 characters');
  });
});
