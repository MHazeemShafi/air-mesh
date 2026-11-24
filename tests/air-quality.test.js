import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirroring air-quality.js data transformation pipeline
function processSensorReadings(latestResults, sensorMap, now = Date.now()) {
  const MAX_AGE_HOURS = 24;
  const FUTURE_TOLERANCE_MINUTES = 5;
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000;
  const futureToleranceMs = FUTURE_TOLERANCE_MINUTES * 60 * 1000;

  const readings = [];
  const staleReadings = [];
  const invalidReadings = [];

  for (const item of latestResults ?? []) {
    const sensor = sensorMap.get(item.sensorsId);

    const reading = {
      parameter: sensor?.parameter ?? 'unknown',
      value: item.value,
      unit: sensor?.unit ?? null,
      time: item.datetime?.utc ?? null,
      sensorId: item.sensorsId,
    };

    if (
      typeof item.value !== 'number' ||
      !Number.isFinite(item.value) ||
      item.value < 0
    ) {
      invalidReadings.push({
        ...reading,
        reason: 'Invalid or negative sensor value',
      });
      continue;
    }

    const timestamp = Date.parse(reading.time);

    if (!Number.isFinite(timestamp)) {
      invalidReadings.push({
        ...reading,
        reason: 'Missing or invalid timestamp',
      });
      continue;
    }

    if (timestamp > now + futureToleranceMs) {
      invalidReadings.push({
        ...reading,
        reason: 'Future timestamp',
      });
      continue;
    }

    if (now - timestamp > maxAgeMs) {
      staleReadings.push({
        ...reading,
        reason: 'Reading older than 24 hours',
      });
      continue;
    }

    readings.push(reading);
  }

  readings.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  return { readings, staleReadings, invalidReadings };
}

test('Air Quality Data Pipeline', async (t) => {
  const sensorMap = new Map([
    [1, { parameter: 'pm25', unit: 'µg/m³' }],
    [2, { parameter: 'pm10', unit: 'µg/m³' }],
    [3, { parameter: 'o3', unit: 'µg/m³' }]
  ]);

  await t.test('filters negative and non-finite values into invalidReadings', () => {
    const now = Date.now();
    const items = [
      { sensorsId: 1, value: -5, datetime: { utc: new Date(now).toISOString() } },
      { sensorsId: 2, value: NaN, datetime: { utc: new Date(now).toISOString() } },
      { sensorsId: 3, value: 'invalid', datetime: { utc: new Date(now).toISOString() } }
    ];

    const result = processSensorReadings(items, sensorMap, now);
    assert.equal(result.readings.length, 0);
    assert.equal(result.invalidReadings.length, 3);
  });

  await t.test('filters invalid timestamps into invalidReadings', () => {
    const now = Date.now();
    const items = [
      { sensorsId: 1, value: 25, datetime: { utc: 'bad-timestamp' } },
      { sensorsId: 2, value: 50, datetime: null }
    ];

    const result = processSensorReadings(items, sensorMap, now);
    assert.equal(result.readings.length, 0);
    assert.equal(result.invalidReadings.length, 2);
  });

  await t.test('filters future timestamps beyond tolerance into invalidReadings', () => {
    const now = Date.now();
    const farFuture = new Date(now + 10 * 60 * 1000).toISOString(); // 10 mins into future
    const withinToleranceFuture = new Date(now + 2 * 60 * 1000).toISOString(); // 2 mins into future

    const items = [
      { sensorsId: 1, value: 20, datetime: { utc: farFuture } },
      { sensorsId: 2, value: 40, datetime: { utc: withinToleranceFuture } }
    ];

    const result = processSensorReadings(items, sensorMap, now);
    assert.equal(result.invalidReadings.length, 1);
    assert.equal(result.readings.length, 1);
    assert.equal(result.readings[0].parameter, 'pm10');
  });

  await t.test('classifies readings older than 24 hours into staleReadings', () => {
    const now = Date.now();
    const staleTime = new Date(now - 26 * 60 * 60 * 1000).toISOString(); // 26h ago
    const freshTime = new Date(now - 1 * 60 * 60 * 1000).toISOString();  // 1h ago

    const items = [
      { sensorsId: 1, value: 30, datetime: { utc: staleTime } },
      { sensorsId: 2, value: 60, datetime: { utc: freshTime } }
    ];

    const result = processSensorReadings(items, sensorMap, now);
    assert.equal(result.staleReadings.length, 1);
    assert.equal(result.staleReadings[0].parameter, 'pm25');
    assert.equal(result.readings.length, 1);
    assert.equal(result.readings[0].parameter, 'pm10');
  });

  await t.test('sorts valid readings newest first', () => {
    const now = Date.now();
    const timeOld = new Date(now - 30 * 60 * 1000).toISOString();
    const timeNew = new Date(now - 5 * 60 * 1000).toISOString();

    const items = [
      { sensorsId: 1, value: 25, datetime: { utc: timeOld } },
      { sensorsId: 2, value: 50, datetime: { utc: timeNew } }
    ];

    const result = processSensorReadings(items, sensorMap, now);
    assert.equal(result.readings.length, 2);
    assert.equal(result.readings[0].parameter, 'pm10', 'Newer reading should be first');
    assert.equal(result.readings[1].parameter, 'pm25');
  });
});
