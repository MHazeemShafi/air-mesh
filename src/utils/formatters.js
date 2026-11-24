export function formatTime(value) {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getReading(readings = [], parameter) {
  if (!Array.isArray(readings)) return undefined;
  return readings.find(
    item => item.parameter?.toLowerCase() === parameter?.toLowerCase()
  );
}

export function getAge(timestamp) {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );
}

export function getFreshness(minutes) {
  if (minutes === null || minutes === undefined) return 'Unknown';
  if (minutes < 120) return 'Recent';
  if (minutes < 360) return 'Delayed';
  return 'Old reading';
}

export async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The server returned an invalid response.');
  }
}

export function getApiMessage(value, fallback) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error;
    }
  }

  return fallback;
}
