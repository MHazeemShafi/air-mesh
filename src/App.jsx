import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Activity, AlertTriangle, Bell, Check, ChevronRight, Download,
  Filter, Gauge, MapPin, Menu, RefreshCw, Search, Settings2,
  ShieldCheck, X
} from 'lucide-react';

// Four demonstration monitoring nodes in Mangaluru.
// These are simulated readings, NOT live sensor data.
const seedSites = [
  {
    id: 'AM-01',
    name: 'Hampankatta Junction',
    city: 'Mangaluru',
    state: 'Karnataka',
    type: 'Heavy traffic',
    lat: 12.8708,
    lng: 74.8429,
    pm25: 68,
    pm10: 112,
    traffic: 'Very high',
    sensors: 1
  },
  {
    id: 'AM-02',
    name: 'Kankanady Junction',
    city: 'Mangaluru',
    state: 'Karnataka',
    type: 'Urban traffic',
    lat: 12.8620,
    lng: 74.8580,
    pm25: 52,
    pm10: 88,
    traffic: 'High',
    sensors: 1
  },
  {
    id: 'AM-03',
    name: 'Kottara Chowki',
    city: 'Mangaluru',
    state: 'Karnataka',
    type: 'Traffic corridor',
    lat: 12.9030,
    lng: 74.8370,
    pm25: 44,
    pm10: 76,
    traffic: 'High',
    sensors: 1
  },
  {
    id: 'AM-04',
    name: 'Baikampady Industrial Area',
    city: 'Mangaluru',
    state: 'Karnataka',
    type: 'Industrial',
    lat: 12.9480,
    lng: 74.8080,
    pm25: 82,
    pm10: 138,
    traffic: 'Moderate',
    sensors: 1
  }
];

const levelOf = n =>
  n >= 90 ? 'Very high' :
  n >= 60 ? 'High' :
  n >= 35 ? 'Elevated' :
  n >= 16 ? 'Moderate' : 'Low';

const classOf = n =>
  n >= 90 ? 'very-high' :
  n >= 60 ? 'high' :
  n >= 35 ? 'elevated' :
  n >= 16 ? 'moderate' : 'low';

const stamp = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

const makeHistory = () =>
  Array.from({ length: 24 }, (_, i) => ({
    time: new Date(Date.now() - (23 - i) * 15 * 60000)
      .toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
    pm25: Math.round(42 + Math.sin(i * 0.48) * 13 + Math.random() * 9),
    pm10: Math.round(68 + Math.sin(i * 0.39) * 18 + Math.random() * 12)
  }));

function HotspotMap({ sites, selectedId, onSelect }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onSelectRef = useRef(onSelect);

  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const map = L.map(elementRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      preferCanvas: true
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const bounds = [];

    sites.forEach(site => {
      const icon = L.divIcon({
        className: 'airmesh-pin-wrap',
        html: `<span class="airmesh-pin ${classOf(site.pm25)}"><i></i></span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([site.lat, site.lng], { icon }).addTo(map);

      marker.on('click', () => onSelectRef.current(site.id));

      marker.bindTooltip(
        `${site.city} · PM2.5 ${site.pm25} µg/m³`
      );

      markersRef.current[site.id] = marker;
      bounds.push([site.lat, site.lng]);
    });

    // Keep the map focused on Mangaluru and its four nodes.
    if (bounds.length) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 13
      });
    }

    const resize = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    resize.observe(elementRef.current);

    requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
    });

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    sites.forEach(site => {
      const marker = markersRef.current[site.id];
      if (!marker) return;

      marker.setIcon(L.divIcon({
        className: 'airmesh-pin-wrap',
        html: `
          <span class="airmesh-pin ${classOf(site.pm25)} ${site.id === selectedId ? 'selected' : ''}">
            <i></i>
          </span>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      }));

      marker.setTooltipContent(
        `${site.city} · PM2.5 ${site.pm25} µg/m³`
      );
    });
  }, [sites, selectedId]);

  return (
    <div
      ref={elementRef}
      className="map-canvas"
      aria-label="Map showing four pollution monitoring nodes in Mangaluru"
    />
  );
}

function SeverityTag({ value }) {
  return (
    <span className={`severity-tag ${classOf(value)}`}>
      {levelOf(value)}
    </span>
  );
}

function App() {
  const [sites, setSites] = useState(seedSites);
  const [selectedId, setSelectedId] = useState('AM-01');
  const [tab, setTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [threshold, setThreshold] = useState(60);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState(makeHistory);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [toast, setToast] = useState('');
  const [simulation, setSimulation] = useState(true);
  const [alertEmail, setAlertEmail] = useState('');

  const toastTimer = useRef(null);

  const selected = sites.find(s => s.id === selectedId) || sites[0];

  const avg25 = Math.round(
    sites.reduce((a, s) => a + s.pm25, 0) / sites.length
  );

  const hotspots = sites
    .filter(s => s.pm25 >= threshold)
    .sort((a, b) => b.pm25 - a.pm25);

  const filtered = useMemo(() =>
    sites.filter(s => {
      const q = search.trim().toLowerCase();

      const matches =
        !q ||
        `${s.name} ${s.city} ${s.state} ${s.type}`
          .toLowerCase()
          .includes(q);

      const matchesFilter =
        filter === 'All' ||
        (filter === 'Hotspots'
          ? s.pm25 >= threshold
          : s.type.toLowerCase().includes(filter.toLowerCase()));

      return matches && matchesFilter;
    }),
    [sites, search, filter, threshold]
  );

  const notify = message => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  // Simulate changing readings every five seconds.
  useEffect(() => {
    if (!simulation) return;

    const timer = setInterval(() => {
      setSites(old =>
        old.map(s => ({
          ...s,
          pm25: Math.max(
            5,
            Math.min(150, Math.round(s.pm25 + (Math.random() - 0.49) * 7))
          ),
          pm10: Math.max(
            10,
            Math.min(240, Math.round(s.pm10 + (Math.random() - 0.48) * 10))
          )
        }))
      );

      setHistory(old => [
        ...old.slice(1),
        {
          time: stamp(),
          pm25: Math.round(40 + Math.random() * 35),
          pm10: Math.round(65 + Math.random() * 55)
        }
      ]);

      setUpdatedAt(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, [simulation]);

  // Create alerts when a node crosses the configured threshold.
  useEffect(() => {
    const crossed = sites.filter(s => s.pm25 >= threshold);

    setAlerts(old => {
      const known = new Set(old.map(a => a.id));

      const fresh = crossed
        .filter(s => !known.has(s.id))
        .map(s => ({
          ...s,
          alertId: `${s.id}-${Date.now()}`,
          time: new Date(),
          seen: false
        }));

      return [...fresh, ...old].slice(0, 30);
    });
  }, [sites, threshold]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const refresh = () => {
    setSites(old =>
      old.map(s => ({
        ...s,
        pm25: Math.max(
          5,
          Math.min(150, Math.round(s.pm25 + (Math.random() - 0.5) * 18))
        ),
        pm10: Math.max(
          10,
          Math.min(240, Math.round(s.pm10 + (Math.random() - 0.5) * 24))
        )
      }))
    );

    setUpdatedAt(new Date());
    notify('Demonstration readings refreshed');
  };

  const exportCsv = () => {
    const rows = [
      [
        'ID', 'Location', 'City', 'State', 'Category',
        'Latitude', 'Longitude', 'PM2.5 ug/m3',
        'PM10 ug/m3', 'Traffic'
      ],
      ...sites.map(s => [
        s.id, s.name, s.city, s.state, s.type,
        s.lat, s.lng, s.pm25, s.pm10, s.traffic
      ])
    ];

    const csv = rows
      .map(row =>
        row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );

    const a = document.createElement('a');
    a.href = url;
    a.download = 'airmesh-mangaluru-nodes.csv';
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('CSV exported');
  };

  const openAlertCentre = () => {
    setTab('Alerts');
    setAlertsOpen(false);
    setMobileOpen(false);
  };

  const navItems = [
    { name: 'Overview', icon: Gauge },
    { name: 'Hotspot map', icon: MapPin },
    { name: 'Locations', icon: Activity },
    { name: 'Alerts', icon: Bell }
  ];

  const precaution =
    selected.pm25 >= 90
      ? 'Very high reading: reduce outdoor exertion, move away from the roadside or emission source, and use a well-fitted particulate respirator if exposure is unavoidable.'
      : selected.pm25 >= 60
        ? 'High reading: limit prolonged outdoor activity near this hotspot, keep distance from traffic queues and consider closing nearby windows.'
        : selected.pm25 >= 35
          ? 'Elevated reading: sensitive people should reduce extended outdoor exertion close to this location.'
          : 'Current demonstration reading is lower. Continue monitoring, especially during traffic peaks.';

  return (
    <div className="app-shell">

      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-symbol" aria-hidden="true">
            <span/><span/><span/>
          </div>

          <div className="brand-name">AirMesh</div>

          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18}/>
          </button>
        </div>

        <div className="brand-caption">AIR POLLUTION INTELLIGENCE</div>
        <div className="side-divider"/>

        <div className="side-label">WORKSPACE</div>

        <div className="workspace-chip">
          <span className="workspace-dot"/>
          Mangaluru monitoring
        </div>

        <div className="side-label nav-heading">MONITORING</div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${tab === name ? 'active' : ''}`}
              onClick={() => {
                setTab(name);
                setMobileOpen(false);
                setAlertsOpen(false);
              }}
            >
              <Icon size={17}/>
              <span>{name}</span>

              {name === 'Alerts' && alerts.length > 0 && (
                <em>{alerts.filter(a => !a.seen).length}</em>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="demo-state">
            <span className="demo-dot"/>
            <div>
              <b>Prototype data</b>
              <small>Simulated readings · Mangaluru</small>
            </div>
          </div>

          <button
            className="nav-link settings-link"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={17}/>
            <span>Alert settings</span>
          </button>

          <div className="side-foot">
            AIR QUALITY IS LOCAL.<br/>
            POLLUTION IS NOT.
          </div>
        </div>
      </aside>

      <main className="main-area">

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20}/>
            </button>

            <div className="breadcrumb">
              <span>AirMesh</span>
              <b>/</b>
              {tab}
            </div>
          </div>

          <div className="topbar-actions">
            <span className="demo-indicator"><i/> DEMO MODE</span>

            <span className="updated-time">
              Updated {updatedAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>

            <button
              className="icon-action"
              onClick={refresh}
              title="Refresh demonstration readings"
              aria-label="Refresh readings"
            >
              <RefreshCw size={17}/>
            </button>

            <button
              className="icon-action alert-action"
              onClick={() => setAlertsOpen(v => !v)}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={17}/>
              {alerts.some(a => !a.seen) && <i/>}
            </button>
          </div>

          {alertsOpen && (
            <div className="notification-popover">
              <div className="popover-title">
                <b>Recent threshold alerts</b>
                <button
                  onClick={() => setAlertsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={15}/>
                </button>
              </div>

              {alerts.length ? (
                alerts.slice(0, 5).map(a => (
                  <button
                    className="popover-item"
                    key={a.alertId}
                    onClick={() => {
                      setSelectedId(a.id);
                      openAlertCentre();
                    }}
                  >
                    <span className={`alert-mini ${classOf(a.pm25)}`}/>
                    <span>
                      <b>{a.city}</b>
                      <small>PM2.5 · {a.pm25} µg/m³</small>
                    </span>
                    <ChevronRight size={15}/>
                  </button>
                ))
              ) : (
                <p className="empty-note">No threshold events yet.</p>
              )}

              <button className="popover-all" onClick={openAlertCentre}>
                Open alert centre
              </button>
            </div>
          )}
        </header>

        {tab === 'Overview' && (
          <div className="page-content">

            <section className="intro-row">
              <div>
                <div className="eyebrow">
                  AIR QUALITY · HOTSPOT INTELLIGENCE
                </div>

                <h1>
                  Find the hotspots.<br/>
                  <span>Understand the air.</span>
                </h1>

                <p>
                  Monitor pollution patterns around busy roads, traffic
                  corridors and industrial areas across Mangaluru.
                </p>
              </div>

              <div className="intro-stamp">
                <span>FIELD VIEW</span>
                <b>01</b>
                <small>MANGALURU</small>
              </div>
            </section>

            <div className="summary-strip">
              <div>
                <span className="summary-label">LOCATIONS MONITORED</span>
                <b>{sites.length.toString().padStart(2, '0')}</b>
              </div>

              <div>
                <span className="summary-label">AVERAGE PM2.5</span>
                <b>{avg25}<small> µg/m³</small></b>
              </div>

              <div>
                <span className="summary-label">ABOVE THRESHOLD</span>
                <b className="red-value">
                  {hotspots.length.toString().padStart(2, '0')}
                </b>
              </div>

              <div>
                <span className="summary-label">NETWORK NODES</span>
                <b>
                  {sites.reduce((a, s) => a + s.sensors, 0)
                    .toString().padStart(2, '0')}
                </b>
              </div>
            </div>

            <section className="section-block map-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">01 / GEOGRAPHIC OVERVIEW</div>
                  <h2>Pollution hotspot map</h2>
                  <p>Four monitoring nodes across Mangaluru.</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setTab('Hotspot map')}
                >
                  Open full map <ChevronRight size={15}/>
                </button>
              </div>

              <div className="map-layout">
                <div className="map-frame">
                  <HotspotMap
                    sites={sites}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />

                  <div className="map-note">
                    <span/> Four demonstration nodes · not live measurements
                  </div>
                </div>

                <aside className="hotspot-rail">
                  <div className="rail-head">
                    <b>Priority locations</b>
                    <span>{hotspots.length} flagged</span>
                  </div>

                  {[...sites]
                    .sort((a, b) => b.pm25 - a.pm25)
                    .map(s => (
                      <button
                        className={`hotspot-row ${selectedId === s.id ? 'chosen' : ''}`}
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                      >
                        <span className={`rank-dot ${classOf(s.pm25)}`}/>

                        <span className="hotspot-copy">
                          <b>{s.city}</b>
                          <small>{s.name}</small>
                        </span>

                        <strong>
                          {s.pm25}
                          <small> PM2.5</small>
                        </strong>
                      </button>
                    ))}

                  <button
                    className="rail-link"
                    onClick={() => setTab('Locations')}
                  >
                    View all locations <ChevronRight size={14}/>
                  </button>
                </aside>
              </div>
            </section>

            <section className="section-block analysis-grid">
              <div className="chart-panel">
                <div className="section-heading compact">
                  <div>
                    <div className="eyebrow">02 / TREND ANALYSIS</div>
                    <h2>Particulate matter trend</h2>
                    <p>Rolling demonstration series · last 6 hours</p>
                  </div>

                  <div className="chart-key">
                    <span className="key-pm25"/> PM2.5
                    <span className="key-pm10"/> PM10
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={history}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="pm25Area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d44b36" stopOpacity={0.22}/>
                          <stop offset="100%" stopColor="#d44b36" stopOpacity={0}/>
                        </linearGradient>

                        <linearGradient id="pm10Area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d2a52e" stopOpacity={0.16}/>
                          <stop offset="100%" stopColor="#d2a52e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        vertical={false}
                        stroke="#e5dfd3"
                        strokeDasharray="3 4"
                      />

                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: '#77796f' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={28}
                      />

                      <YAxis
                        width={38}
                        tick={{ fontSize: 10, fill: '#77796f' }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          border: '1px solid #d8d0c2',
                          borderRadius: 0,
                          background: '#fbf9f3',
                          fontSize: 11
                        }}
                      />

                      <ReferenceLine
                        y={threshold}
                        stroke="#c64a35"
                        strokeDasharray="5 5"
                        label={{
                          value: 'Alert',
                          position: 'insideTopRight',
                          fill: '#c64a35',
                          fontSize: 9
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="pm10"
                        name="PM10"
                        stroke="#c49a2b"
                        strokeWidth={2}
                        fill="url(#pm10Area)"
                      />

                      <Area
                        type="monotone"
                        dataKey="pm25"
                        name="PM2.5"
                        stroke="#c64a35"
                        strokeWidth={2.5}
                        fill="url(#pm25Area)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-foot">
                  <span>Units: µg/m³</span>
                  <span>New point every 5 seconds</span>
                </div>
              </div>

              <aside className="selected-panel">
                <div className="eyebrow">03 / LOCATION INSIGHT</div>

                <div className="selected-title">
                  <div>
                    <h2>{selected.city}</h2>
                    <p>{selected.name}</p>
                  </div>

                  <SeverityTag value={selected.pm25}/>
                </div>

                <div className="reading-main">
                  <span>PM2.5</span>
                  <b>{selected.pm25}<small> µg/m³</small></b>
                </div>

                <div className="reading-pair">
                  <div>
                    <span>PM10</span>
                    <b>{selected.pm10} <small>µg/m³</small></b>
                  </div>

                  <div>
                    <span>TRAFFIC CONTEXT</span>
                    <b>{selected.traffic}</b>
                  </div>
                </div>

                <div className="source-type">
                  {selected.type} <span>·</span> {selected.sensors} monitoring node
                </div>

                <div className="precaution">
                  <div>
                    <ShieldCheck size={16}/>
                    <b>Suggested precaution</b>
                  </div>
                  <p>{precaution}</p>
                </div>
              </aside>
            </section>

            <footer className="page-footer">
              <span>AIRMESH · MANGALURU AIR POLLUTION MONITORING</span>
              <span>PROTOTYPE / SIMULATED DATA</span>
            </footer>
          </div>
        )}

        {tab === 'Hotspot map' && (
          <div className="page-content">
            <section className="page-title">
              <div className="eyebrow">GEOGRAPHIC EXPLORER</div>
              <h1>Hotspot map</h1>
              <p>
                Four demonstration nodes cover selected traffic and
                industrial areas in Mangaluru. Select a marker to inspect it.
              </p>
            </section>

            <div className="map-full">
              <HotspotMap
                sites={sites}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            <div className="map-full-footer">
              <span><i className="legend low"/> Low</span>
              <span><i className="legend moderate"/> Moderate</span>
              <span><i className="legend elevated"/> Elevated</span>
              <span><i className="legend high"/> High</span>
              <span><i className="legend very-high"/> Very high</span>
              <span className="map-disclaimer">
                Mangaluru demo nodes · not live air-quality data
              </span>
            </div>

            <div className="map-selection">
              <b>{selected.city} — {selected.name}</b>
              <span>
                PM2.5 {selected.pm25} µg/m³ · PM10 {selected.pm10} µg/m³
              </span>
              <SeverityTag value={selected.pm25}/>
            </div>
          </div>
        )}

        {tab === 'Locations' && (
          <div className="page-content">
            <section className="page-title">
              <div className="eyebrow">MONITORING DIRECTORY</div>
              <h1>Locations</h1>
              <p>Four traffic and industrial monitoring points in Mangaluru.</p>
            </section>

            <div className="directory-tools">
              <label className="search-field">
                <Search size={17}/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search monitoring node..."
                />
              </label>

              <label className="filter-field">
                <Filter size={15}/>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Hotspots</option>
                  <option>Traffic</option>
                  <option>Industrial</option>
                </select>
              </label>

              <button className="outline-button" onClick={exportCsv}>
                <Download size={15}/> Export CSV
              </button>
            </div>

            <div className="location-list">
              {filtered.map(s => (
                <article className="location-card" key={s.id}>
                  <div className={`location-symbol ${classOf(s.pm25)}`}>
                    <MapPin size={18}/>
                  </div>

                  <div className="location-main">
                    <div className="location-name">
                      <h3>{s.name}</h3>
                      <SeverityTag value={s.pm25}/>
                    </div>

                    <p>{s.city}, {s.state} · {s.type}</p>

                    <small>
                      {s.traffic} traffic context · {s.sensors} monitoring node
                    </small>
                  </div>

                  <div className="location-measure">
                    <b>{s.pm25}</b>
                    <span>PM2.5 µg/m³</span>
                  </div>

                  <button
                    className="inspect-button"
                    onClick={() => {
                      setSelectedId(s.id);
                      setTab('Overview');
                    }}
                  >
                    Inspect <ChevronRight size={15}/>
                  </button>
                </article>
              ))}

              {filtered.length === 0 && (
                <div className="empty-state">
                  No locations match that search.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'Alerts' && (
          <div className="page-content">
            <section className="page-title">
              <div className="eyebrow">THRESHOLD MONITORING</div>
              <h1>Alerts</h1>
              <p>
                Sample events generated when a demonstration reading
                reaches your configured threshold.
              </p>
            </section>

            <div className="alert-summary">
              <div>
                <span>THRESHOLD</span>
                <b>{threshold} <small>µg/m³</small></b>
              </div>

              <div>
                <span>LOCATIONS ABOVE</span>
                <b>{hotspots.length}</b>
              </div>

              <div>
                <span>RECORDED EVENTS</span>
                <b>{alerts.length}</b>
              </div>
            </div>

            <div className="alert-list">
              {alerts.length ? (
                alerts.map(a => (
                  <article className="alert-card" key={a.alertId}>
                    <div className={`alert-symbol ${classOf(a.pm25)}`}>
                      <AlertTriangle size={18}/>
                    </div>

                    <div className="alert-description">
                      <b>{a.city} · {a.name}</b>
                      <p>
                        PM2.5 reading reached {a.pm25} µg/m³.
                        Configured threshold: {threshold} µg/m³.
                      </p>
                      <small>{a.time.toLocaleString()}</small>
                    </div>

                    <SeverityTag value={a.pm25}/>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <Check size={20}/> No threshold events recorded yet.
                </div>
              )}
            </div>

            <div className="alert-disclaimer">
              Alerts are generated from simulated values in this prototype.
              No emergency or public-health notification is sent.
            </div>
          </div>
        )}
      </main>

      {settingsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">CONFIGURATION</div>
                <h2 id="settings-title">Alert settings</h2>
              </div>

              <button
                className="icon-action"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                <X size={18}/>
              </button>
            </div>

            <p>
              Choose the PM2.5 level that flags a location as a hotspot
              in this demonstration.
            </p>

            <label className="setting-label">
              PM2.5 threshold <b>{threshold} µg/m³</b>
            </label>

            <input
              className="threshold-range"
              type="range"
              min="15"
              max="120"
              step="5"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
            />

            <div className="range-ends">
              <span>15 · lower</span>
              <span>120 · higher</span>
            </div>

            <label className="setting-label email-label">
              Optional notification contact
            </label>

            <input
              className="email-input"
              type="email"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              placeholder="team@example.com"
            />

            <p className="setting-note">
              Email delivery is not connected. This field is saved only
              for the current page session.
            </p>

            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>

              <button
                className="solid-button"
                onClick={() => {
                  setSettingsOpen(false);
                  notify('Alert threshold updated');
                }}
              >
                Apply settings <Check size={15}/>
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast-message">
          <Check size={16}/>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;