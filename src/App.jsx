import React, { useEffect, useMemo, useRef, useState } from 'react';
import GradientWave from "./components/GradientWave";
import L from 'leaflet';
import {
  Activity, AlertCircle, AlertTriangle, ArrowUpRight,
  CheckCircle2, ChevronDown, Clock, Cloud, Database,
  Droplets, Gauge, HeartPulse, Info, Leaf, Mail,
  MapPin, Menu, Radio, RefreshCw, ShieldCheck,
  Thermometer, Wind, X, Save, Bell, Settings
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import './alerts.css';

const API_URL = '/api/air-quality';
const REFRESH_INTERVAL = 5 * 60 * 1000;

const STATION = {
  name: 'Kadri, Mangalore - KSPCB',
  city: 'Mangaluru',
  state: 'Karnataka',
  lat: 12.889,
  lng: 74.842
};

const POLLUTANTS = [
  { id: 'pm25', name: 'PM2.5', description: 'Fine particulate matter', icon: Cloud },
  { id: 'pm10', name: 'PM10', description: 'Coarse particulate matter', icon: Cloud },
  { id: 'o3', name: 'Ozone', description: 'Ground-level ozone', icon: Activity },
  { id: 'no2', name: 'Nitrogen dioxide', description: 'NO₂', icon: Activity },
  { id: 'so2', name: 'Sulphur dioxide', description: 'SO₂', icon: Activity },
  { id: 'co', name: 'Carbon monoxide', description: 'CO', icon: Activity },
  { id: 'no', name: 'Nitric oxide', description: 'NO', icon: Activity },
  { id: 'nox', name: 'Nitrogen oxides', description: 'NOx', icon: Activity }
];

const WEATHER = [
  { id: 'temperature', name: 'Temperature', icon: Thermometer },
  { id: 'relativehumidity', name: 'Humidity', icon: Droplets },
  { id: 'wind_speed', name: 'Wind speed', icon: Wind },
  { id: 'wind_direction', name: 'Wind direction', icon: Wind }
];

const NAV_ITEMS = [
  { name: 'Overview', icon: Gauge },
  { name: 'Pollutants', icon: Activity },
  { name: 'Station', icon: MapPin },
  { name: 'Health guidance', icon: HeartPulse },
  { name: 'Email alerts', icon: Mail }
];

const POLLUTANT_UNITS = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  o3: 'µg/m³',
  no2: 'ppb',
  so2: 'ppb',
  co: 'ppb',
  no: 'ppb',
  nox: 'ppb'
};

const DEFAULT_THRESHOLDS = {
  pm25: '15',
  pm10: '',
  o3: '',
  no2: '',
  so2: '',
  co: '',
  no: '',
  nox: ''
};

function formatTime(value) {
  if (!value) return 'Unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getReading(readings, parameter) {
  return readings.find(
    item => item.parameter?.toLowerCase() === parameter
  );
}

function getAge(timestamp) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );
}

function getFreshness(minutes) {
  if (minutes === null) return 'Unknown';
  if (minutes < 120) return 'Recent';
  if (minutes < 360) return 'Delayed';
  return 'Old reading';
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The server returned an invalid response.');
  }
}

// Safely extract messages from API responses.
function getApiMessage(value, fallback) {
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

function Accordion({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`accordion ${open ? 'expanded' : ''}`}>
      <button
        className="accordion-trigger"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        <span>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <ChevronDown className={open ? 'rotated' : ''} size={18} />
      </button>

      {open && <div className="accordion-content">{children}</div>}
    </section>
  );
}

function MapView() {
  const element = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!element.current || mapRef.current) return;

    const map = L.map(element.current, {
      scrollWheelZoom: false
    }).setView([STATION.lat, STATION.lng], 14);

    mapRef.current = map;

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(map);

    const marker = L.marker([
      STATION.lat,
      STATION.lng
    ]).addTo(map);

    marker.bindPopup(`
      <strong>${STATION.name}</strong><br/>
      CPCB monitoring station<br/>
      Data source: OpenAQ
    `);

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    observer.observe(element.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={element}
      className="map-canvas"
      aria-label="Kadri monitoring station map"
    />
  );
}

function App() {
  const [stationData, setStationData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState('respiratory_sensitive');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [selectedPollutants, setSelectedPollutants] = useState(['pm25']);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);

  const [subscribeStatus, setSubscribeStatus] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsRequestStatus, setSettingsRequestStatus] = useState('');
  const [settingsRequestLoading, setSettingsRequestLoading] = useState(false);

  // Accept both versions of the settings-link parameter.
  const [manageToken, setManageToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get('manageAlerts') ||
      params.get('alert-settings') ||
      ''
    );
  });

  const [manageLoading, setManageLoading] = useState(false);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageStatus, setManageStatus] = useState('');
  const [manageError, setManageError] = useState('');

  const requestRef = useRef(false);

  const readings = stationData?.readings || [];

  const latestReading = useMemo(() => {
    if (!readings.length) return null;

    return readings.reduce((latest, current) => {
      return new Date(current.time) > new Date(latest.time)
        ? current
        : latest;
    });
  }, [readings]);

  const pm25 = getReading(readings, 'pm25');

  const currentCount =
    stationData?.freshness?.currentReadings ?? readings.length;

  const staleCount =
    stationData?.freshness?.staleReadings ?? 0;

  const invalidCount =
    stationData?.freshness?.invalidReadings ?? 0;

  const sensorAge = getAge(latestReading?.time);
  const freshness = getFreshness(sensorAge);

  const fetchData = async () => {
    if (requestRef.current) return;

    requestRef.current = true;
    setRefreshing(true);

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.readings)) {
        throw new Error('Invalid API response: readings are missing');
      }

      setStationData(data);
      setLastFetch(new Date());
      setError('');
      setStatus(data.readings.length ? 'available' : 'unavailable');
    } catch (err) {
      setError(err.message || 'Unable to retrieve station data');
      setStatus('error');
    } finally {
      requestRef.current = false;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const timer = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // Load saved preferences from a secure emailed link.
  useEffect(() => {
    if (!manageToken) return;

    let cancelled = false;

    const loadSettings = async () => {
      setActiveTab('Email alerts');
      setManageLoading(true);
      setManageError('');
      setManageStatus('');

      try {
        const response = await fetch(
          `/api/manage-alert-settings?token=${encodeURIComponent(manageToken)}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
          }
        );

        const data = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            getApiMessage(data.error, 'Unable to load your settings.')
          );
        }

        if (cancelled) return;

        setProfile(data.profile || 'respiratory_sensitive');
        setAlertsEnabled(data.enabled === true);

        const validPollutants = Array.isArray(data.pollutants)
          ? data.pollutants.filter(id => Object.hasOwn(POLLUTANT_UNITS, id))
          : ['pm25'];

        setSelectedPollutants(validPollutants);

        const nextThresholds = { ...DEFAULT_THRESHOLDS };

        for (const id of validPollutants) {
          const value = data.thresholds?.[id]?.value;

          if (value !== undefined && value !== null) {
            nextThresholds[id] = String(value);
          }
        }

        setThresholds(nextThresholds);
        setManageStatus('Your current notification settings have loaded.');
      } catch (err) {
        if (!cancelled) {
          setManageError(err.message || 'Unable to load settings.');
        }
      } finally {
        if (!cancelled) setManageLoading(false);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [manageToken]);

  const buildPreferences = () => {
    const cleanThresholds = {};

    for (const id of selectedPollutants) {
      const value = Number(thresholds[id]);

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 100000
      ) {
        throw new Error(
          `Enter a valid threshold for ${id.toUpperCase()}.`
        );
      }

      cleanThresholds[id] = {
        value,
        unit: POLLUTANT_UNITS[id]
      };
    }

    if (selectedPollutants.length === 0) {
      throw new Error('Select at least one pollutant.');
    }

    return {
      profile,
      enabled: alertsEnabled,
      pollutants: selectedPollutants,
      thresholds: cleanThresholds,
      frequency: 'important'
    };
  };

  const handleSubscribe = async event => {
    event.preventDefault();
    setSubscribeStatus('');
    setSubscribeLoading(true);

    try {
      const preferences = buildPreferences();

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email,
          ...preferences,
          preferences
        })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiMessage(
            data.error || data.message,
            `Subscription failed (${response.status}).`
          )
        );
      }

      setSubscribeStatus(
        getApiMessage(
          data.message,
          'Check your inbox to confirm your subscription.'
        )
      );

      setEmail('');
    } catch (err) {
      setSubscribeStatus(err.message || 'Unable to subscribe.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  // Request a secure settings link for an existing subscriber.
  const handleRequestSettings = async event => {
    event.preventDefault();
    setSettingsRequestStatus('');
    setSettingsRequestLoading(true);

    try {
      const response = await fetch('/api/request-alert-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email: settingsEmail
        })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiMessage(
            data.error || data.message,
            'Unable to request a settings link.'
          )
        );
      }

      setSettingsRequestStatus(
        getApiMessage(
          data.message,
          'If your verified subscription exists, a settings link will be sent to your email.'
        )
      );

      setSettingsEmail('');
    } catch (err) {
      setSettingsRequestStatus(
        err.message || 'Unable to request a settings link.'
      );
    } finally {
      setSettingsRequestLoading(false);
    }
  };

  const handleSaveSettings = async event => {
    event.preventDefault();
    setManageStatus('');
    setManageError('');
    setManageSaving(true);

    try {
      const preferences = buildPreferences();

      const response = await fetch('/api/manage-alert-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          token: manageToken,
          ...preferences
        })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiMessage(data.error, 'Unable to save your preferences.')
        );
      }

      setManageStatus(
        getApiMessage(data.message, 'Your notification settings have been saved.')
      );
    } catch (err) {
      setManageError(err.message || 'Unable to save settings.');
    } finally {
      setManageSaving(false);
    }
  };

  const closeManageSettings = () => {
    setManageToken('');
    setManageStatus('');
    setManageError('');

    const url = new URL(window.location.href);
    url.searchParams.delete('manageAlerts');
    url.searchParams.delete('alert-settings');

    window.history.replaceState({}, '', url);

    setActiveTab('Email alerts');
  };

  const togglePollutant = id => {
    setSelectedPollutants(current => (
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    ));
  };

  const changeTab = name => {
    setActiveTab(name);
    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const renderPollutantGrid = items => (
    <div className="pollutant-grid">
      {items.map(item => {
        const reading = getReading(readings, item.id);
        const Icon = item.icon;

        return (
          <article className="pollutant-item" key={item.id}>
            <span className="pollutant-icon"><Icon size={18} /></span>
            <div className="pollutant-copy">
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </div>
            <div className="pollutant-value">
              <strong>{reading ? reading.value : '—'}</strong>
              <small>{reading?.unit || 'No data'}</small>
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderOverview = () => (
    <div className="page-content">
      <section className="hero">
        <div className="hero-atmosphere" />

        <div className="hero-topline">
          <span className="hero-kicker">
            <span className="live-dot" />
            LOCAL ENVIRONMENTAL MONITORING
          </span>
          <span className="hero-location">
            <MapPin size={14} />
            {STATION.city}, {STATION.state}
          </span>
        </div>

        <div className="hero-main">
          <div className="hero-copy">
            <span className="hero-overline">
              A CLEARER VIEW OF THE AIR AROUND YOU
            </span>
            <h1>Breathe with<br /><span>awareness.</span></h1>
            <p>
              Understand local air measurements, explore environmental
              conditions, and make more informed everyday decisions.
            </p>
            <button className="hero-link" onClick={() => changeTab('Pollutants')}>
              Explore measurements <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="hero-reading">
            <div className="reading-heading">
              <span className="reading-indicator" />
              LATEST PM2.5 MEASUREMENT
            </div>
            <div className="hero-reading-number">
              {pm25 ? pm25.value : '--'}
              <span>{pm25?.unit || 'µg/m³'}</span>
            </div>
            <div className="reading-meta">
              <span>Reported measurement</span>
              <span className={`freshness-label ${freshness.toLowerCase().replace(' ', '-')}`}>
                {freshness}
              </span>
            </div>
            <div className="reading-timestamp">
              <Clock size={13} />
              {pm25 ? formatTime(pm25.time) : 'Waiting for readings'}
            </div>
          </div>
        </div>

        <div className="hero-footer">
          <span>
            <Radio size={14} />
            {stationData?.provider || 'CPCB'} / {stationData?.source || 'OpenAQ'}
          </span>
          <span>
            {latestReading
              ? `Latest sensor reading: ${formatTime(latestReading.time)}`
              : 'Waiting for sensor data'}
          </span>
        </div>
      </section>

      <section className="quick-stats">
        <div className="quick-stat">
          <span className="stat-icon"><MapPin size={17} /></span>
          <div><small>MONITORING STATIONS</small><strong>01</strong></div>
        </div>
        <div className="quick-stat">
          <span className="stat-icon"><Activity size={17} /></span>
          <div><small>CURRENT READINGS</small><strong>{currentCount}</strong></div>
        </div>
        <div className="quick-stat">
          <span className="stat-icon"><Clock size={17} /></span>
          <div>
            <small>LAST SENSOR UPDATE</small>
            <strong className="stat-time">
              {latestReading ? formatTime(latestReading.time) : 'Unavailable'}
            </strong>
          </div>
        </div>
        <div className="quick-stat">
          <span className="stat-icon"><Database size={17} /></span>
          <div><small>DATA PROVIDER</small><strong>CPCB / OpenAQ</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / LIVE MONITORING</span>
            <h2>What is the air reporting?</h2>
            <p>{STATION.name}</p>
          </div>
          <button className="outline-button" onClick={fetchData} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Updating' : 'Refresh data'}
          </button>
        </div>

        {status === 'loading' && (
          <div className="notice-card">
            <RefreshCw className="spin" size={18} />
            Retrieving monitoring station data...
          </div>
        )}

        {status === 'error' && (
          <div className="notice-card error-card">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to retrieve sensor data</strong>
              <p>{error}</p>
              <button className="text-button" onClick={fetchData}>Try again</button>
            </div>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="notice-card">
            <AlertTriangle size={20} />
            No sufficiently recent sensor readings are available.
          </div>
        )}

        {status === 'available' && (
          <>
            <div className="measurement-feature">
              <div className="measurement-feature-top">
                <div>
                  <span className="eyebrow">FINE PARTICULATE MATTER</span>
                  <h3>PM2.5 concentration</h3>
                </div>
                <span className="measurement-icon"><Cloud size={24} /></span>
              </div>
              <div className="measurement-number">
                <strong>{pm25 ? pm25.value : '--'}</strong>
                <span>{pm25?.unit || 'µg/m³'}</span>
              </div>
              <div className="measurement-bottom">
                <span>Sensor-reported value</span>
                <span>{pm25 ? formatTime(pm25.time) : 'No PM2.5 reading'}</span>
              </div>
            </div>

            <div className="info-note">
              <Info size={18} />
              <p>
                This is a PM2.5 measurement, not an official CPCB AQI.
                Official AQI calculation requires relevant pollutant
                sub-indices and prescribed averaging periods.
              </p>
            </div>

            <Accordion title="Other pollutant measurements" subtitle="Expand to explore the available readings">
              {renderPollutantGrid(POLLUTANTS)}
            </Accordion>

            <Accordion title="Weather and environmental conditions" subtitle="Temperature, humidity and wind measurements">
              {renderPollutantGrid(WEATHER)}
            </Accordion>
          </>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / GEOGRAPHIC CONTEXT</span>
            <h2>Where is this data coming from?</h2>
            <p>Explore the reporting station's location.</p>
          </div>
          <span className="small-tag">01 STATION</span>
        </div>

        <div className="map-panel">
          <div className="map-heading">
            <div><strong>{STATION.name}</strong><small>{STATION.city}, {STATION.state}</small></div>
            <span className="map-status"><span className="live-dot" /> MONITORING LOCATION</span>
          </div>
          <MapView />
          <div className="map-footer">
            <span><MapPin size={13} /> {STATION.lat}, {STATION.lng}</span>
            <span>Map data © OpenStreetMap</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / DATA TRANSPARENCY</span>
            <h2>Know where the numbers come from.</h2>
            <p>Measurement age, validation and source information.</p>
          </div>
        </div>

        <Accordion title="Data quality and timestamps" subtitle="View current, stale and invalid reading counts">
          <div className="quality-grid">
            <div><small>CURRENT</small><strong>{currentCount}</strong></div>
            <div><small>STALE</small><strong>{staleCount}</strong></div>
            <div><small>INVALID</small><strong>{invalidCount}</strong></div>
            <div><small>MAXIMUM AGE</small><strong>24h</strong></div>
          </div>
          <div className="metadata-list">
            <div><span>API fetched</span><strong>{formatTime(stationData?.fetchedAt)}</strong></div>
            <div><span>Latest measurement</span><strong>{formatTime(latestReading?.time)}</strong></div>
            <div><span>Last browser fetch</span><strong>{formatTime(lastFetch)}</strong></div>
            <div><span>Provider</span><strong>{stationData?.provider || 'Unavailable'}</strong></div>
            <div><span>Source</span><strong>{stationData?.source || 'Unavailable'}</strong></div>
          </div>
        </Accordion>
      </section>

      <section className="cta-panel">
        <div className="cta-icon"><HeartPulse size={23} /></div>
        <div>
          <span className="eyebrow">PERSONAL AWARENESS</span>
          <h2>Make environmental information easier to follow.</h2>
          <p>Explore general guidance and learn how to stay informed about local monitoring measurements.</p>
        </div>
        <button className="solid-button" onClick={() => changeTab('Health guidance')}>
          Health guidance <ArrowUpRight size={16} />
        </button>
      </section>

      <footer className="page-footer">
        <span>AIRMESH / MANGALURU AIR MONITORING</span>
        <span>REAL SENSOR DATA / CPCB VIA OPENAQ</span>
      </footer>
    </div>
  );

  const renderPollutants = () => (
    <div className="page-content">
      <section className="page-title">
        <span className="eyebrow">SENSOR MEASUREMENTS</span>
        <h1>Explore the readings.</h1>
        <p>
          Individual measurements reported by the Kadri monitoring station.
          Values are displayed in the units supplied by the source.
        </p>
      </section>

      <div className="measurement-summary">
        <div>
          <span className="eyebrow">AVAILABLE MEASUREMENTS</span>
          <strong>{currentCount}</strong>
          <small>Current readings</small>
        </div>
        <div>
          <span className="eyebrow">LAST SENSOR UPDATE</span>
          <strong className="summary-time">
            {latestReading ? formatTime(latestReading.time) : 'Unavailable'}
          </strong>
          <small>{freshness}</small>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">01 / AIR POLLUTANTS</span><h2>Pollutant measurements</h2><p>Explore the available pollutant readings.</p></div>
        </div>
        {renderPollutantGrid(POLLUTANTS)}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">02 / ENVIRONMENT</span><h2>Weather measurements</h2><p>Additional environmental readings from the station.</p></div>
        </div>
        {renderPollutantGrid(WEATHER)}
      </section>

      <div className="info-note">
        <Info size={18} />
        <p>
          Missing readings are not treated as zero. Measurements use the
          units supplied by OpenAQ. This page does not calculate an official CPCB AQI.
        </p>
      </div>
    </div>
  );

  const renderStation = () => (
    <div className="page-content">
      <section className="page-title">
        <span className="eyebrow">MONITORING NETWORK</span>
        <h1>One station. Real measurements.</h1>
        <p>Information about the real-world monitoring location currently connected to AirMesh.</p>
      </section>

      <div className="station-detail-card">
        <div className="station-card-heading">
          <span className="station-symbol"><MapPin size={23} /></span>
          <span className="eyebrow">REGISTERED MONITORING LOCATION</span>
        </div>
        <h2>{stationData?.station || STATION.name}</h2>
        <p>{STATION.city}, {STATION.state}, India</p>

        <div className="quality-grid">
          <div><small>PROVIDER</small><strong>{stationData?.provider || 'CPCB'}</strong></div>
          <div><small>DATA SOURCE</small><strong>{stationData?.source || 'OpenAQ'}</strong></div>
          <div><small>CURRENT</small><strong>{currentCount}</strong></div>
          <div><small>STALE</small><strong>{staleCount}</strong></div>
        </div>

        <Accordion title="Technical station information">
          <div className="metadata-list">
            <div><span>Invalid readings</span><strong>{invalidCount}</strong></div>
            <div><span>Maximum reading age</span><strong>{stationData?.freshness?.maximumAgeHours ?? 24} hours</strong></div>
            <div><span>Coordinates</span><strong>{STATION.lat}, {STATION.lng}</strong></div>
            <div><span>Latest sensor reading</span><strong>{formatTime(latestReading?.time)}</strong></div>
            <div><span>API fetched</span><strong>{formatTime(stationData?.fetchedAt)}</strong></div>
          </div>
        </Accordion>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">LOCATION</span><h2>Kadri, Mangaluru</h2><p>Geographic location of the reporting station.</p></div>
        </div>
        <div className="map-panel">
          <MapView />
          <div className="map-footer">
            <span><MapPin size={13} /> {STATION.lat}, {STATION.lng}</span>
            <span>Map data © OpenStreetMap</span>
          </div>
        </div>
      </section>
    </div>
  );

  const renderGuidance = () => (
    <div className="page-content">
      <section className="page-title">
        <span className="eyebrow">ENVIRONMENT & WELLBEING</span>
        <h1>Understand your exposure.</h1>
        <p>
          General information to help interpret air-quality measurements.
          This is educational guidance, not a personal medical assessment.
        </p>
      </section>

      <div className="guidance-intro">
        <div className="guidance-intro-icon"><Leaf size={25} /></div>
        <div>
          <span className="eyebrow">A MORE INFORMED APPROACH</span>
          <h2>Air quality can affect people differently.</h2>
          <p>
            Children, older adults, and people with respiratory or
            cardiovascular conditions may be more sensitive to air pollution.
            Individual responses vary.
          </p>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">01 / UNDERSTANDING PM2.5</span><h2>Why fine particles matter</h2><p>Learn what this measurement represents.</p></div>
        </div>

        <div className="guidance-grid">
          <article className="guidance-card">
            <span className="guidance-card-icon"><Cloud size={20} /></span>
            <h3>Fine particles</h3>
            <p>PM2.5 refers to airborne particles with a diameter of 2.5 micrometres or smaller. These particles can travel deep into the respiratory system.</p>
          </article>
          <article className="guidance-card">
            <span className="guidance-card-icon"><HeartPulse size={20} /></span>
            <h3>Individual sensitivity</h3>
            <p>Some people may be more sensitive to pollution. Personal health needs and medical advice should guide individual decisions.</p>
          </article>
          <article className="guidance-card">
            <span className="guidance-card-icon"><Clock size={20} /></span>
            <h3>Check measurement time</h3>
            <p>Always consider when a measurement was recorded. A delayed reading may not represent current outdoor conditions.</p>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">02 / PRACTICAL AWARENESS</span><h2>Things worth checking</h2><p>Useful considerations when reviewing local readings.</p></div>
        </div>

        <div className="guidance-list">
          <div><span>01</span><section><strong>Check the timestamp</strong><p>Look at the sensor measurement time, not just when the website refreshed.</p></section></div>
          <div><span>02</span><section><strong>Look beyond one pollutant</strong><p>Different pollutants have different sources and health considerations.</p></section></div>
          <div><span>03</span><section><strong>Consider your surroundings</strong><p>Traffic, construction, weather and indoor sources can affect exposure.</p></section></div>
          <div><span>04</span><section><strong>Follow professional advice</strong><p>People with existing health conditions should follow guidance from their healthcare professional.</p></section></div>
        </div>
      </section>

      <div className="info-note">
        <Info size={18} />
        <p>
          AirMesh currently displays measurements from one monitoring station.
          These readings do not represent every neighbourhood or indoor
          environment in Mangaluru. This page does not diagnose, predict,
          or treat health conditions.
        </p>
      </div>
    </div>
  );

  const renderThresholdFields = () => (
    <div className="alert-threshold-list">
      {POLLUTANTS.map(item => {
        const selected = selectedPollutants.includes(item.id);

        return (
          <div className={`alert-threshold-row ${selected ? 'selected' : ''}`} key={item.id}>
            <label className="alert-pollutant-choice">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => togglePollutant(item.id)}
              />
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>
            </label>

            <div className="alert-threshold-input">
              <input
                type="number"
                min="0.1"
                step="any"
                value={thresholds[item.id] || ''}
                onChange={event => setThresholds(current => ({
                  ...current,
                  [item.id]: event.target.value
                }))}
                disabled={!selected}
                placeholder="Threshold"
                aria-label={`${item.name} threshold`}
              />
              <span>{POLLUTANT_UNITS[item.id]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderProfileControls = () => (
    <>
      <div className="alert-profile-options">
        <label className={`alert-profile-option ${profile === 'respiratory_sensitive' ? 'active' : ''}`}>
          <input
            type="radio"
            name="alert-profile"
            value="respiratory_sensitive"
            checked={profile === 'respiratory_sensitive'}
            onChange={() => setProfile('respiratory_sensitive')}
          />
          <span className="alert-profile-icon"><HeartPulse size={19} /></span>
          <span>
            <strong>Respiratory-sensitive</strong>
            <small>Starts with PM2.5 at 15 µg/m³. You can change this threshold.</small>
          </span>
        </label>

        <label className={`alert-profile-option ${profile === 'general' ? 'active' : ''}`}>
          <input
            type="radio"
            name="alert-profile"
            value="general"
            checked={profile === 'general'}
            onChange={() => setProfile('general')}
          />
          <span className="alert-profile-icon"><Bell size={19} /></span>
          <span>
            <strong>General updates</strong>
            <small>Choose the pollutant measurements you want to follow.</small>
          </span>
        </label>

        <label className={`alert-profile-option ${profile === 'custom' ? 'active' : ''}`}>
          <input
            type="radio"
            name="alert-profile"
            value="custom"
            checked={profile === 'custom'}
            onChange={() => setProfile('custom')}
          />
          <span className="alert-profile-icon"><Settings size={19} /></span>
          <span>
            <strong>Custom profile</strong>
            <small>Set your own pollutant selection and thresholds.</small>
          </span>
        </label>
      </div>

      <div className="alert-enable-row">
        <div>
          <strong>Enable daily notifications</strong>
          <small>Turn this off to pause your email alerts.</small>
        </div>
        <label className="alert-switch">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={event => setAlertsEnabled(event.target.checked)}
          />
          <span />
        </label>
      </div>

      <div className="alert-threshold-heading">
        <div>
          <strong>Pollutant thresholds</strong>
          <small>Receive an email when a selected fresh reading is above your limit.</small>
        </div>
      </div>

      {renderThresholdFields()}

      <div className="info-note alert-info-note">
        <Info size={18} />
        <p>
          PM2.5's starting value of 15 µg/m³ is a reference-based setting,
          not a medical threshold or a diagnosis. Other pollutant thresholds
          are chosen by you. Each pollutant retains its own measurement unit.
        </p>
      </div>
    </>
  );

  const renderEmail = () => (
    <div className="page-content">
      <section className="page-title">
        <span className="eyebrow">AIR QUALITY NOTIFICATIONS</span>
        <h1>Stay in the loop.</h1>
        <p>
          Choose which station measurements you want AirMesh to monitor
          and receive a daily email when your selected limits are exceeded.
        </p>
      </section>

      {manageToken ? (
        <div className="alert-manage-panel">
          <div className="alert-panel-heading">
            <span className="alert-panel-icon"><Settings size={22} /></span>
            <div>
              <span className="eyebrow">SECURE SETTINGS LINK</span>
              <h2>Manage your notifications.</h2>
              <p>Update your profile, thresholds or notification status.</p>
            </div>
          </div>

          {manageLoading ? (
            <div className="notice-card">
              <RefreshCw size={18} className="spin" />
              Loading your saved preferences...
            </div>
          ) : manageError ? (
            <div className="notice-card error-card">
              <AlertCircle size={18} />
              <div>
                <strong>Settings link unavailable</strong>
                <p>{manageError}</p>
                <button className="text-button" onClick={closeManageSettings}>
                  Return to email alerts
                </button>
              </div>
            </div>
          ) : (
            <form className="alert-settings-form" onSubmit={handleSaveSettings}>
              {renderProfileControls()}

              <button className="solid-button alert-save-button" type="submit" disabled={manageSaving}>
                {manageSaving ? 'Saving...' : 'Save notification settings'}
                <Save size={16} />
              </button>

              {manageStatus && <p className="form-message success-message" role="status">{manageStatus}</p>}
              {manageError && <p className="form-message error-message" role="alert">{manageError}</p>}
            </form>
          )}

          <button className="alert-secondary-button" onClick={closeManageSettings}>
            Close settings
          </button>
        </div>
      ) : (
        <>
          <div className="alert-frequency-banner">
            <span className="alert-frequency-icon"><Clock size={20} /></span>
            <div>
              <strong>One scheduled check each day</strong>
              <p>
                AirMesh checks the latest eligible station readings once daily,
                approximately around 9 AM IST. This is not an instant warning service.
              </p>
            </div>
          </div>

          <div className="email-layout">
            <div className="email-intro">
              <div className="cta-icon"><Mail size={24} /></div>
              <span className="eyebrow">PERSONAL AIR QUALITY UPDATES</span>
              <h2>Choose what matters to you.</h2>
              <p>
                Select a notification profile and the pollutant measurements
                you want to follow. Your email must be verified before alerts
                can be activated.
              </p>

              <div className="email-benefit">
                <CheckCircle2 size={17} />
                Email verification before activation
              </div>
              <div className="email-benefit">
                <ShieldCheck size={17} />
                Secure link for changing preferences
              </div>
              <div className="email-benefit">
                <Clock size={17} />
                Daily scheduled threshold checks
              </div>
              <div className="email-benefit">
                <Info size={17} />
                No medical diagnosis or symptom prediction
              </div>
            </div>

            <form className="email-form alert-subscribe-form" onSubmit={handleSubscribe}>
              <span className="eyebrow">CREATE YOUR SUBSCRIPTION</span>

              <label htmlFor="subscriber-email">Email address</label>
              <input
                id="subscriber-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={subscribeLoading}
              />

              <div className="alert-form-divider" />
              <span className="eyebrow">YOUR NOTIFICATION PREFERENCES</span>

              {renderProfileControls()}

              <button className="solid-button alert-save-button" type="submit" disabled={subscribeLoading}>
                {subscribeLoading ? 'Sending confirmation...' : 'Subscribe and verify'}
                <ArrowUpRight size={16} />
              </button>

              {subscribeStatus && (
                <p className="form-message" role="status">{subscribeStatus}</p>
              )}

              <small>
                Submitting this form sends a confirmation email. Your
                notification preferences are saved with your subscription.
              </small>
            </form>
          </div>

          <section className="alert-existing-panel">
            <div>
              <span className="eyebrow">ALREADY SUBSCRIBED?</span>
              <h2>Change your notification settings.</h2>
              <p>
                Request a secure link to update your profile, thresholds,
                or pause your notifications.
              </p>
            </div>

            <form className="alert-settings-request" onSubmit={handleRequestSettings}>
              <label htmlFor="settings-email">Subscribed email address</label>
              <div className="alert-request-controls">
                <input
                  id="settings-email"
                  type="email"
                  value={settingsEmail}
                  onChange={event => setSettingsEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={settingsRequestLoading}
                />
                <button className="outline-button" type="submit" disabled={settingsRequestLoading}>
                  {settingsRequestLoading ? 'Sending...' : 'Send settings link'}
                  <ArrowUpRight size={15} />
                </button>
              </div>
              {settingsRequestStatus && (
                <p className="form-message" role="status">{settingsRequestStatus}</p>
              )}
            </form>
          </section>

          <div className="info-note">
            <Info size={18} />
            <p>
              AirMesh currently monitors one station in Kadri, Mangaluru.
              Alerts use fresh supported readings from that station only.
              They do not represent every neighbourhood or indoor environment.
            </p>
          </div>
        </>
      )}

      <footer className="page-footer">
        <span>AIRMESH / PERSONAL NOTIFICATIONS</span>
        <span>DAILY CHECKS / KADRI STATION</span>
      </footer>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'Pollutants') return renderPollutants();
    if (activeTab === 'Station') return renderStation();
    if (activeTab === 'Health guidance') return renderGuidance();
    if (activeTab === 'Email alerts') return renderEmail();
    return renderOverview();
  };

  return (
    <>
      <GradientWave />

      <div className="app-shell">
        {sidebarOpen && (
          <button
            className="mobile-scrim"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-symbol"><span /><span /><span /></div>
          <div className="brand-name">AirMesh<span>.</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="brand-caption">ENVIRONMENTAL INTELLIGENCE</div>
        <div className="side-divider" />
        <div className="side-label">YOUR LOCATION</div>

        <div className="workspace-chip">
          <span className="workspace-dot" />
          <span>Mangaluru, Karnataka</span>
        </div>

        <div className="side-label nav-heading">NAVIGATION</div>

        <nav className="side-nav">
          {NAV_ITEMS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${activeTab === name ? 'active' : ''}`}
              onClick={() => changeTab(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="demo-state">
            <span className={`demo-dot ${status === 'available' ? 'connected' : ''}`} />
            <div>
              <b>
                {status === 'available'
                  ? 'Data available'
                  : status === 'loading'
                    ? 'Connecting...'
                    : 'Data unavailable'}
              </b>
              <small>CPCB via OpenAQ</small>
            </div>
          </div>

          <div className="side-foot">
            AIR QUALITY IS LOCAL.
            <br />
            KNOW YOUR ENVIRONMENT.
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={19} />
            </button>
            <div className="breadcrumb">
              <span>AirMesh</span><b>/</b>{activeTab}
            </div>
          </div>

          <div className="topbar-actions">
            <span className={`connection-status ${status}`}>
              <span />
              {status === 'available' ? 'DATA AVAILABLE' : status.toUpperCase()}
            </span>
            <button
              className="icon-action"
              onClick={fetchData}
              disabled={refreshing}
              title="Refresh sensor data"
              aria-label="Refresh sensor data"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </header>

        {renderContent()}
      </main>

      <nav className="mobile-bottom-nav">
        {NAV_ITEMS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={activeTab === name ? 'active' : ''}
            onClick={() => changeTab(name)}
          >
            <Icon size={18} />
            <span>
              {name === 'Health guidance'
                ? 'Health'
                : name === 'Email alerts'
                  ? 'Alerts'
                  : name}
            </span>
          </button>
        ))}
        </nav>
      </div>
    </>
  );
}

export default App;