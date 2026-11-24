import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentReadings,
  findExceededThresholds,
  getIndiaDate,
  ALLOWED_UNITS
} from '../api/daily-respiratory-alerts.js';

test('Alert Evaluation Logic', async (t) => {
  await t.test('getCurrentReadings should correctly parse reading.time from air-quality.js', () => {
    const nowIso = new Date().toISOString();
    const payload = {
      dataStatus: 'available',
      readings: [
        {
          parameter: 'pm25',
          value: 38.5,
          unit: 'µg/m³',
          time: nowIso,
          sensorId: 101
        },
        {
          parameter: 'pm10',
          value: 65.2,
          unit: 'µg/m³',
          time: nowIso,
          sensorId: 102
        }
      ]
    };

    const current = getCurrentReadings(payload);
    assert.ok(current.pm25, 'pm25 reading should be present');
    assert.equal(current.pm25.value, 38.5);
    assert.equal(current.pm25.unit, 'µg/m³');
    assert.equal(typeof current.pm25.timestamp, 'number');

    assert.ok(current.pm10, 'pm10 reading should be present');
    assert.equal(current.pm10.value, 65.2);
  });

  await t.test('getCurrentReadings should discard readings older than 24 hours', () => {
    const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const payload = {
      dataStatus: 'available',
      readings: [
        {
          parameter: 'pm25',
          value: 45,
          unit: 'µg/m³',
          time: oldTime
        }
      ]
    };

    const current = getCurrentReadings(payload);
    assert.equal(current.pm25, undefined, 'Stale reading (>24h) should be excluded');
  });

  await t.test('getCurrentReadings should discard future readings (>5m in future)', () => {
    const futureTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const payload = {
      dataStatus: 'available',
      readings: [
        {
          parameter: 'pm25',
          value: 45,
          unit: 'µg/m³',
          time: futureTime
        }
      ]
    };

    const current = getCurrentReadings(payload);
    assert.equal(current.pm25, undefined, 'Future reading should be excluded');
  });

  await t.test('findExceededThresholds should detect exceeded thresholds accurately', () => {
    const preference = {
      pollutants: ['pm25', 'pm10'],
      thresholds: {
        pm25: { value: 15, unit: 'µg/m³' },
        pm10: { value: 50, unit: 'µg/m³' }
      }
    };

    const readings = {
      pm25: { value: 25.4, unit: 'µg/m³', timestamp: Date.now() }, // Exceeded (25.4 > 15)
      pm10: { value: 42.0, unit: 'µg/m³', timestamp: Date.now() }  // Not exceeded (42 <= 50)
    };

    const exceeded = findExceededThresholds(preference, readings);
    assert.equal(exceeded.length, 1);
    assert.equal(exceeded[0].pollutant, 'pm25');
    assert.equal(exceeded[0].value, 25.4);
    assert.equal(exceeded[0].threshold, 15);
  });

  await t.test('findExceededThresholds should not trigger when below or equal to threshold', () => {
    const preference = {
      pollutants: ['pm25'],
      thresholds: {
        pm25: { value: 25, unit: 'µg/m³' }
      }
    };

    const readings = {
      pm25: { value: 25.0, unit: 'µg/m³', timestamp: Date.now() }
    };

    const exceeded = findExceededThresholds(preference, readings);
    assert.equal(exceeded.length, 0, 'Equal value should not exceed threshold');
  });

  await t.test('getIndiaDate returns valid YYYY-MM-DD format', () => {
    const dateStr = getIndiaDate();
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/, 'Should match YYYY-MM-DD pattern');
  });
});
