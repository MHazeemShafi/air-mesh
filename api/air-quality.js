
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OpenAQ API key is not configured",
    });
  }

  const headers = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };

  try {
    const [latestResponse, locationResponse] = await Promise.all([
      fetch(
        "https://api.openaq.org/v3/locations/44513/latest?limit=1000",
        { headers }
      ),
      fetch(
        "https://api.openaq.org/v3/locations/44513",
        { headers }
      ),
    ]);

    if (!latestResponse.ok || !locationResponse.ok) {
      return res.status(502).json({
        error: "Unable to retrieve OpenAQ data",
        latestStatus: latestResponse.status,
        locationStatus: locationResponse.status,
      });
    }

    const latestData = await latestResponse.json();
    const locationData = await locationResponse.json();

    const location = locationData.results?.[0];

    if (!location) {
      return res.status(502).json({
        error: "Station details were not found",
      });
    }

    const sensorMap = new Map(
      (location.sensors ?? []).map((sensor) => [
        sensor.id,
        {
          parameter: sensor.parameter?.name?.toLowerCase(),
          unit: sensor.parameter?.units ?? null,
        },
      ])
    );

    const readings = (latestData.results ?? []).map((item) => {
      const sensor = sensorMap.get(item.sensorsId);

      return {
        parameter: sensor?.parameter ?? "unknown",
        value: item.value,
        unit: sensor?.unit ?? null,
        time: item.datetime?.utc ?? null,
        sensorId: item.sensorsId,
      };
    });

    return res.status(200).json({
      station: location.name ?? "Kadri, Mangalore - KSPCB",
      provider: location.provider?.name ?? "Unknown",
      source: "OpenAQ",
      fetchedAt: new Date().toISOString(),
      readings,
    });
  } catch {
    return res.status(500).json({
      error: "Failed to contact OpenAQ",
    });
  }
}
