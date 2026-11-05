
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
    const [latestResponse, sensorsResponse] = await Promise.all([
      fetch(
        "https://api.openaq.org/v3/locations/44513/latest?limit=1000",
        { headers }
      ),
      fetch(
        "https://api.openaq.org/v3/locations/44513/sensors?limit=1000",
        { headers }
      ),
    ]);

    if (!latestResponse.ok || !sensorsResponse.ok) {
      return res.status(502).json({
        error: "Unable to retrieve station data",
        latestStatus: latestResponse.status,
        sensorsStatus: sensorsResponse.status,
      });
    }

    const latestData = await latestResponse.json();
    const sensorsData = await sensorsResponse.json();

    const sensorMap = new Map(
      (sensorsData.results ?? []).map((sensor) => [
        sensor.id,
        {
          parameter: sensor.parameter?.name?.toLowerCase(),
          unit: sensor.parameter?.units ?? null,
        },
      ])
    );

    const readings = (latestData.results ?? [])
      .map((item) => {
        const sensor = sensorMap.get(item.sensorsId);

        return {
          parameter: sensor?.parameter ?? "unknown",
          value: item.value,
          unit: sensor?.unit ?? null,
          time: item.datetime?.utc ?? null,
          sensorId: item.sensorsId,
        };
      })
      .filter((item) => item.parameter !== "unknown");

    return res.status(200).json({
      station: "Kadri, Mangalore - KSPCB",
      provider: "CPCB via OpenAQ",
      source: "OpenAQ",
      fetchedAt: new Date().toISOString(),
      readings,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to contact OpenAQ",
    });
  }
}
