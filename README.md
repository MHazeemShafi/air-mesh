AirMesh

Urban Air Quality Monitoring & Alert Platform

AirMesh is a web-based air quality monitoring platform that brings environmental data into a clear, interactive dashboard. It monitors reported air quality measurements from the Kadri CPCB/KSPCB monitoring station in Mangaluru, Karnataka, helping users understand pollutant levels and changing environmental conditions.

Using OpenAQ as its data source, AirMesh presents pollutant measurements, weather information, monitoring station details, and historical visualizations in one place.

The platform also includes an email subscription system designed to support configurable air quality alerts.

---

Features

- Live Air Quality Data — Retrieves reported monitoring measurements through the OpenAQ API.
- Multiple Pollutants — Displays PM2.5, PM10, O₃, NO₂, SO₂, CO, NO, and NOx.
- Weather Monitoring — Presents temperature, humidity, wind speed, and wind direction.
- Interactive Station Map — Displays the monitoring station using Leaflet and OpenStreetMap.
- Data Validation — Separates current, stale, and invalid measurements to improve data transparency.
- Automatic Refresh — Refreshes air quality data every five minutes.
- Data Visualization — Presents environmental measurements through interactive charts.
- Email Subscriptions — Supports email registration and verification.
- Configurable Alert Preferences — Supports pollutant selection, notification profiles, and threshold preferences.
- Responsive Interface — Designed for desktop and mobile screens.

Monitoring Location

Kadri CPCB/KSPCB Monitoring Station

Mangaluru, Karnataka, India

Coordinates: "12.889, 74.842"

AirMesh retrieves measurements associated with this monitoring location through OpenAQ.

Technology Stack

Technology| Purpose
React| Frontend interface
JavaScript| Application logic
Vite| Development and build tooling
Supabase| Subscription data storage
OpenAQ API| Air quality measurements
Leaflet| Interactive mapping
OpenStreetMap| Map tiles
Recharts| Data visualization
Lucide React| Interface icons
Resend| Email verification
Vercel| Deployment and serverless API

Architecture

AirMesh uses a React frontend supported by serverless API endpoints.

```text
OpenAQ API
|
v
Vercel API Endpoint
/api/air-quality
|
v
React App
|
+----------+----------+
|          |          |
v          v          v
Air Data    Charts     Station Map
|
v
Dashboard

   Email Subscription
           |
           v
    /api/subscribe
           |
   +-------+-------+
   |               |
   v               v
Supabase          Resend
   |               |
   v               v

Preferences       Verification
|               |
+-------+-------+
|
v
Verified Subscriber
```

Getting Started

Prerequisites

- Node.js
- npm
- Git

Installation

Clone the repository:

```bash
git clone https://github.com/MHazeemShafi/air-mesh.git
```

Navigate into the project:

```bash
cd air-mesh
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite.

Production Build

To generate a production build:

```bash
npm run build
```

Environment Variables

The backend requires the following environment variables:

Variable| Purpose
"OPENAQ_API_KEY"| OpenAQ API authentication
"SUPABASE_URL"| Supabase project URL
"SUPABASE_SERVICE_ROLE_KEY"| Server-side Supabase access
"RESEND_API_KEY"| Resend email authentication
"RESEND_FROM_EMAIL"| Sender email address
"APP_URL"| Deployed application URL

Keep secret environment variables on the server. Never expose the Supabase service role key or API secrets in frontend code.

Backend API

Endpoint| Method| Description
"/api/air-quality"| GET| Retrieves and validates air quality measurements
"/api/subscribe"| POST| Registers an email subscription and sends a verification email
"/api/verify-subscription"| GET| Verifies a subscriber's email address

The subscription system uses Supabase tables for subscriber records and alert preferences.

Email verification links expire after 24 hours.

Data Quality

AirMesh does not treat every returned measurement as current.

The backend checks measurements for:

- Missing or invalid numerical values.
- Negative readings.
- Missing or invalid timestamps.
- Measurements dated too far into the future.
- Measurements older than 24 hours.

Measurements are categorized into:

- Current readings
- Stale readings
- Invalid readings

This helps distinguish unavailable or outdated measurements from usable data.

Important Notes

- AirMesh displays reported pollutant measurements; it does not independently measure pollution.
- Official AQI calculations are not currently implemented.
- Data availability depends on the monitoring station and OpenAQ.
- The station map displays the monitoring location, not a live pollution heatmap.
- Email subscriptions require successful email verification.
- Automated alert delivery depends on the configured scheduled alert-processing backend.

AirMesh is an independent monitoring and visualization project, not an official government air quality reporting service.

---

Project

GitHub: https://github.com/MHazeemShafi/air-mesh

Developer: MHazeemShafi

Built to make environmental data easier to access, understand, and monitor.
