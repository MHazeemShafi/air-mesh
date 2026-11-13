# AirMesh
### Air Quality Monitoring for Mangaluru

AirMesh is a web-based air quality monitoring platform that makes environmental data easier to access, explore and understand. It brings pollutant readings, station information, interactive maps and configurable email alerts together in one responsive interface.

The platform currently retrieves air quality measurements from the Kadri monitoring station in Mangaluru through the OpenAQ API, providing users with a clear view of available readings and their freshness.

## Features

- **Air Quality Monitoring** — View the latest available pollutant measurements from the monitoring station.
- **Pollutant Information** — Explore measurements for PM2.5, PM10, ozone, nitrogen dioxide and other supported pollutants.
- **Interactive Map** — View the monitoring station's geographical location using Leaflet.
- **Data Visualization** — Explore environmental measurements through charts and visual indicators.
- **Reading Validation** — Separate current, stale and invalid measurements to make data freshness clearer.
- **Email Notifications** — Subscribe to receive alerts when selected pollutant readings exceed your configured thresholds.
- **Alert Preferences** — Choose notification profiles, pollutants and individual threshold values.
- **Email Verification** — Confirm subscriptions through a verification link sent to the subscriber's email address.
- **Responsive Interface** — Access the platform across desktop and mobile devices.

## Data Source

AirMesh retrieves air quality measurements using the **OpenAQ API v3**.

| Detail | Information |
|---|---|
| Monitoring station | Kadri, Mangaluru – KSPCB |
| Location | Mangaluru, Karnataka, India |
| Data platform | OpenAQ |
| Station location ID | 44513 |
| Coordinates | 12.889° N, 74.842° E |

The application checks measurement timestamps and values before presenting readings. Measurements older than 24 hours, invalid values and readings with timestamps too far in the future are excluded from the current readings.

**Data interpretation:** AirMesh presents pollutant measurements from its configured monitoring station. These measurements should not be interpreted as official CPCB AQI values or as a substitute for health or medical advice. Conditions may vary across different locations.

## Supported Pollutants

AirMesh supports the presentation of the following parameters, depending on sensor availability:

| Parameter | Description |
|---|---|
| PM2.5 | Fine particulate matter |
| PM10 | Coarse particulate matter |
| O₃ | Ground-level ozone |
| NO₂ | Nitrogen dioxide |
| SO₂ | Sulphur dioxide |
| CO | Carbon monoxide |
| NO | Nitric oxide |
| NOx | Nitrogen oxides |

## Email Alert System

AirMesh includes a configurable email notification system.

1. Enter an email address and select alert preferences.
2. Choose a notification profile or configure individual pollutant thresholds.
3. Confirm the subscription using the verification email.
4. The scheduled notification process checks recent station readings against enabled subscriber preferences.
5. An email is sent when a selected pollutant exceeds its configured threshold.

The notification service uses Brevo for email delivery and Supabase for subscriber and preference management.

The scheduled notification check runs daily through Vercel Cron. Notifications depend on the availability and freshness of the station measurements.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface development |
| JavaScript | Application logic |
| Vite | Development server and build tooling |
| CSS | Styling and responsive layouts |
| Recharts | Data visualization |
| Leaflet | Interactive maps |
| Lucide React | Interface icons |
| OpenAQ API v3 | Air quality measurements |
| Supabase | Database and subscriber management |
| Brevo | Email delivery |
| Vercel | Hosting and serverless API deployment |

## Application Architecture

AirMesh follows a web-based architecture:

1. **Frontend:** React displays air quality information, station details, charts and alert preferences.
2. **API Layer:** Vercel serverless functions retrieve and process external air quality data.
3. **Data Provider:** OpenAQ supplies measurements and station information.
4. **Database:** Supabase stores subscriber records and notification preferences.
5. **Email Service:** Brevo handles verification emails and pollution notifications.
6. **Scheduled Processing:** Vercel Cron triggers the daily notification check.

## Local Development

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/MHazeemShafi/air-mesh.git
```

Navigate to the project directory:

```bash
cd air-mesh
```

Install dependencies:

```bash
npm install
```

### Environment Configuration

Configure the following environment variables in your local environment and Vercel project:

```env
OPENAQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BREVO_API_KEY=
BREVO_FROM_EMAIL=
BREVO_FROM_NAME=AirMesh
APP_URL=
CRON_SECRET=
```

Keep private API keys and service-role credentials on the server. Never expose them in frontend code or commit them to the repository.

### Run the Development Server

```bash
npm run dev
```

### Create a Production Build

```bash
npm run build
```

### Preview the Production Build

```bash
npm run preview
```

The application uses Vercel serverless functions for its `/api` endpoints. Configure the required environment variables and Supabase database tables before deploying the complete application.

## Deployment

AirMesh is designed for deployment on Vercel.

The frontend is built using Vite, while the `api/` directory contains serverless functions for data retrieval, subscription management, verification and notifications.

The daily notification endpoint is configured through `vercel.json`.

## Project Objective

AirMesh aims to make local air quality information more accessible by presenting environmental measurements in a clear and understandable format.

By combining station readings, geographical visualization and configurable email alerts, the project helps users stay informed about changes in the air quality data available for Mangaluru.

## Future Scope

- Integration of additional monitoring stations.
- Wider geographical coverage.
- Historical pollution data and trend analysis.
- More detailed environmental reporting.
- Improvements to notification scheduling and preferences.
- Additional air quality insights and visualizations.

---

**AirMesh**  
*Making air quality information easier to access and understand.*
