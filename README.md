# AirMesh
### Urban Air Pollution Hotspot Monitoring System

AirMesh is a web-based application designed to visualize potential air pollution hotspots in urban environments. It focuses on monitoring areas affected by traffic congestion, busy roads, and industrial activity.

The application provides an interactive dashboard for viewing particulate matter readings, exploring monitoring locations, analyzing pollution data, and identifying areas that exceed configured thresholds.

**Note:** The current implementation uses simulated pollution readings for demonstration purposes. It is not connected to physical sensors or live air-quality data sources.

## Features

- Interactive map displaying monitoring locations.
- PM2.5 and PM10 pollution readings.
- Location-based monitoring and analysis.
- Charts for visualizing pollution data.
- Configurable pollution thresholds and alerts.
- CSV export for monitoring data.
- Responsive dashboard interface.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend development |
| JavaScript | Application logic |
| CSS3 | Styling and responsive design |
| Vite | Development and build tooling |
| Leaflet | Interactive mapping |
| OpenStreetMap | Map tiles |
| Recharts | Data visualization |
| Lucide React | Interface icons |

## Installation

### Requirements

- Node.js
- npm

### Setup

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/AirMesh.git
```

Navigate to the project directory:

```bash
cd AirMesh
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

### Production Build

```bash
npm run build
```

## Current Implementation

AirMesh currently operates as a frontend application. Monitoring locations and demonstration readings are predefined within the application.

Leaflet is used for interactive mapping, while Recharts handles data visualization. The alert system compares pollution readings against configured thresholds.

## Planned Development

- Backend API integration.
- Database for storing monitoring data.
- Integration with physical air-quality sensors.
- Live pollution data updates.
- Historical pollution analysis.
- Expanded monitoring capabilities.

## Project Scope

The current version is a demonstration prototype focused on visualizing and presenting urban air pollution data. Real-world deployment would require validated sensor readings, backend infrastructure, and appropriate sensor calibration.