import {
  Activity, Cloud, Droplets, Gauge, HeartPulse,
  Mail, MapPin, Thermometer, Wind
} from 'lucide-react';

export const API_URL = '/api/air-quality';
export const REFRESH_INTERVAL = 5 * 60 * 1000;

export const STATION = {
  name: 'Kadri, Mangalore - KSPCB',
  city: 'Mangaluru',
  state: 'Karnataka',
  lat: 12.889,
  lng: 74.842
};

export const POLLUTANTS = [
  { id: 'pm25', name: 'PM2.5', description: 'Fine particulate matter', icon: Cloud },
  { id: 'pm10', name: 'PM10', description: 'Coarse particulate matter', icon: Cloud },
  { id: 'o3', name: 'Ozone', description: 'Ground-level ozone', icon: Activity },
  { id: 'no2', name: 'Nitrogen dioxide', description: 'NO₂', icon: Activity },
  { id: 'so2', name: 'Sulphur dioxide', description: 'SO₂', icon: Activity },
  { id: 'co', name: 'Carbon monoxide', description: 'CO', icon: Activity },
  { id: 'no', name: 'Nitric oxide', description: 'NO', icon: Activity },
  { id: 'nox', name: 'Nitrogen oxides', description: 'NOx', icon: Activity }
];

export const WEATHER = [
  { id: 'temperature', name: 'Temperature', icon: Thermometer },
  { id: 'relativehumidity', name: 'Humidity', icon: Droplets },
  { id: 'wind_speed', name: 'Wind speed', icon: Wind },
  { id: 'wind_direction', name: 'Wind direction', icon: Wind }
];

export const NAV_ITEMS = [
  { name: 'Overview', icon: Gauge },
  { name: 'Pollutants', icon: Activity },
  { name: 'Station', icon: MapPin },
  { name: 'Health guidance', icon: HeartPulse },
  { name: 'Email alerts', icon: Mail }
];

export const POLLUTANT_UNITS = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  o3: 'µg/m³',
  no2: 'ppb',
  so2: 'ppb',
  co: 'ppb',
  no: 'ppb',
  nox: 'ppb'
};

export const DEFAULT_THRESHOLDS = {
  pm25: '15',
  pm10: '',
  o3: '',
  no2: '',
  so2: '',
  co: '',
  no: '',
  nox: ''
};
