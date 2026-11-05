
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

  try {
    const response = await fetch(
      "https://api.openaq.org/v3/locations/44513/latest?limit=1000",
      {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Unable to retrieve data from OpenAQ",
        upstreamStatus: response.status,
      });
    }

    const data = await response.json();

    const readings = (data.results ?? [])
      .map((item) => ({
        parameter: item.parameter?.name?.toLowerCase(),
        value: item.value,
        unit: item.parameter?.units ?? null,
        time:
          item.datetime?.utc ??
          item.period?.datetimeTo?.utc ??
          null,
      }))
      .filter(
        (item) =>
          ["pm25", "pm2.5", "pm10"].includes(item.parameter) &&
          typeof item.value === "number"
      );

    return res.status(200).json({
      station: "Kadri, Mangalore - KSPCB",
      provider: "CPCB via OpenAQ",
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

