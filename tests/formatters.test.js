import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  getReading,
  getAge,
  getFreshness,
  getApiMessage
} from '../src/utils/formatters.js';

test('Frontend Formatters & Utilities', async (t) => {
  await t.test('formatTime formats valid dates in Indian format', () => {
    const iso = '2026-11-24T10:30:00.000Z';
    const formatted = formatTime(iso);
    assert.notEqual(formatted, 'Unavailable');
    assert.ok(formatted.includes('Nov') || formatted.includes('11') || formatted.includes('24'));
  });

  await t.test('formatTime handles invalid dates safely', () => {
    assert.equal(formatTime(null), 'Unavailable');
    assert.equal(formatTime('not-a-date'), 'Unavailable');
    assert.equal(formatTime(undefined), 'Unavailable');
  });

  await t.test('getReading finds parameters case-insensitively', () => {
    const readings = [
      { parameter: 'PM25', value: 45.2, unit: 'µg/m³' },
      { parameter: 'o3', value: 12.0, unit: 'µg/m³' }
    ];

    const found = getReading(readings, 'pm25');
    assert.ok(found);
    assert.equal(found.value, 45.2);

    const foundO3 = getReading(readings, 'O3');
    assert.ok(foundO3);
    assert.equal(foundO3.value, 12.0);

    const notFound = getReading(readings, 'co');
    assert.equal(notFound, undefined);
  });

  await t.test('getFreshness categorizes reading age accurately', () => {
    assert.equal(getFreshness(null), 'Unknown');
    assert.equal(getFreshness(30), 'Recent');    // < 120 mins
    assert.equal(getFreshness(180), 'Delayed');   // < 360 mins
    assert.equal(getFreshness(400), 'Old reading'); // >= 360 mins
  });

  await t.test('getApiMessage extracts messages cleanly', () => {
    assert.equal(getApiMessage('Simple string', 'fallback'), 'Simple string');
    assert.equal(getApiMessage({ message: 'Object message' }, 'fallback'), 'Object message');
    assert.equal(getApiMessage({ error: 'Object error' }, 'fallback'), 'Object error');
    assert.equal(getApiMessage(null, 'fallback'), 'fallback');
  });
});
