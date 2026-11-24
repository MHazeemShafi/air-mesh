import {
  Activity, AlertCircle, AlertTriangle, ArrowUpRight,
  Clock, Cloud, Database, HeartPulse, Info, MapPin, Radio, RefreshCw
} from 'lucide-react';
import MapView from './MapView';
import Accordion from './Accordion';
import { STATION, POLLUTANTS, WEATHER } from '../constants';
import { formatTime, getReading } from '../utils/formatters';

export default function OverviewTab({
  stationData,
  status,
  error,
  refreshing,
  fetchData,
  lastFetch,
  latestReading,
  pm25,
  freshness,
  currentCount,
  staleCount,
  invalidCount,
  changeTab,
  renderPollutantGrid
}) {
  // Exclude PM2.5 from the "other pollutants" list so it's not redundantly shown
  const otherPollutants = POLLUTANTS.filter(p => p.id !== 'pm25');

  return (
    <div className="page-content" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
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

            <h1>
              Breathe with<br />
              <span>awareness.</span>
            </h1>

            <p>
              Understand local air measurements, explore environmental
              conditions, and make more informed everyday decisions.
            </p>

            <button
              type="button"
              className="hero-link"
              onClick={() => changeTab('Pollutants')}
            >
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
              <span className={`freshness-label ${freshness.toLowerCase().replaceAll(' ', '-')}`}>
                {freshness}
              </span>
            </div>

            <div className="reading-timestamp">
              <Clock size={13} />
              {pm25
                ? formatTime(pm25.time)
                : 'Waiting for readings'}
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

      <section className="quick-stats" aria-label="Summary statistics">
        <div className="quick-stat">
          <span className="stat-icon">
            <MapPin size={17} />
          </span>
          <div>
            <small>MONITORING STATIONS</small>
            <strong>01</strong>
          </div>
        </div>

        <div className="quick-stat">
          <span className="stat-icon">
            <Activity size={17} />
          </span>
          <div>
            <small>CURRENT READINGS</small>
            <strong>{currentCount}</strong>
          </div>
        </div>

        <div className="quick-stat">
          <span className="stat-icon">
            <Clock size={17} />
          </span>
          <div>
            <small>LAST SENSOR UPDATE</small>
            <strong className="stat-time">
              {latestReading
                ? formatTime(latestReading.time)
                : 'Unavailable'}
            </strong>
          </div>
        </div>

        <div className="quick-stat">
          <span className="stat-icon">
            <Database size={17} />
          </span>
          <div>
            <small>DATA PROVIDER</small>
            <strong>CPCB / OpenAQ</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / LIVE MONITORING</span>
            <h2>What is the air reporting?</h2>
            <p>{STATION.name}</p>
          </div>

          <button
            type="button"
            className="outline-button"
            onClick={fetchData}
            disabled={refreshing}
            aria-label="Refresh air quality sensor data"
          >
            <RefreshCw
              size={14}
              className={refreshing ? 'spin' : ''}
            />
            {refreshing ? 'Updating' : 'Refresh data'}
          </button>
        </div>

        {status === 'loading' && (
          <div className="notice-card" role="status">
            <RefreshCw className="spin" size={18} />
            Retrieving monitoring station data...
          </div>
        )}

        {status === 'error' && (
          <div className="notice-card error-card" role="alert">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to retrieve sensor data</strong>
              <p>{error}</p>
              <button type="button" className="text-button" onClick={fetchData}>
                Try again
              </button>
            </div>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="notice-card" role="status">
            <AlertTriangle size={20} />
            No sufficiently recent sensor readings are available from the station.
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

                <span className="measurement-icon">
                  <Cloud size={24} />
                </span>
              </div>

              <div className="measurement-number">
                <strong>{pm25 ? pm25.value : '--'}</strong>
                <span>{pm25?.unit || 'µg/m³'}</span>
              </div>

              <div className="measurement-bottom">
                <span>Sensor-reported value</span>
                <span>
                  {pm25
                    ? formatTime(pm25.time)
                    : 'No PM2.5 reading'}
                </span>
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

            <Accordion
              title="Other pollutant measurements"
              subtitle="Expand to explore additional chemical and particulate readings"
            >
              {renderPollutantGrid(otherPollutants)}
            </Accordion>

            <Accordion
              title="Weather and environmental conditions"
              subtitle="Temperature, humidity and wind measurements"
            >
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
            <div>
              <strong>{STATION.name}</strong>
              <small>{STATION.city}, {STATION.state}</small>
            </div>

            <span className="map-status">
              <span className="live-dot" />
              MONITORING LOCATION
            </span>
          </div>

          <MapView />

          <div className="map-footer">
            <span>
              <MapPin size={13} />
              {STATION.lat}, {STATION.lng}
            </span>
            <span>Map data © OpenStreetMap contributors</span>
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

        <Accordion
          title="Data quality and timestamps"
          subtitle="View current, stale and invalid reading counts"
        >
          <div className="quality-grid">
            <div><small>CURRENT</small><strong>{currentCount}</strong></div>
            <div><small>STALE</small><strong>{staleCount}</strong></div>
            <div><small>INVALID</small><strong>{invalidCount}</strong></div>
            <div><small>MAXIMUM AGE</small><strong>24h</strong></div>
          </div>

          <div className="metadata-list">
            <div>
              <span>API fetched</span>
              <strong>{formatTime(stationData?.fetchedAt)}</strong>
            </div>
            <div>
              <span>Latest measurement</span>
              <strong>{formatTime(latestReading?.time)}</strong>
            </div>
            <div>
              <span>Last browser fetch</span>
              <strong>{formatTime(lastFetch)}</strong>
            </div>
            <div>
              <span>Provider</span>
              <strong>{stationData?.provider || 'Unavailable'}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>{stationData?.source || 'Unavailable'}</strong>
            </div>
          </div>
        </Accordion>
      </section>

      <section className="cta-panel">
        <div className="cta-icon">
          <HeartPulse size={23} />
        </div>

        <div>
          <span className="eyebrow">PERSONAL AWARENESS</span>
          <h2>Make environmental information easier to follow.</h2>
          <p>
            Explore general guidance and learn how to stay informed
            about local monitoring measurements.
          </p>
        </div>

        <button
          type="button"
          className="solid-button"
          onClick={() => changeTab('Health guidance')}
        >
          Health guidance <ArrowUpRight size={16} />
        </button>
      </section>

      <footer className="page-footer">
        <span>AIRMESH / MANGALURU AIR MONITORING</span>
        <span>REAL SENSOR DATA / CPCB VIA OPENAQ</span>
      </footer>
    </div>
  );
}
