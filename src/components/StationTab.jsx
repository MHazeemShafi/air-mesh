import { MapPin } from 'lucide-react';
import MapView from './MapView';
import Accordion from './Accordion';
import { STATION } from '../constants';
import { formatTime } from '../utils/formatters';

export default function StationTab({
  stationData,
  currentCount,
  staleCount,
  invalidCount,
  latestReading
}) {
  return (
    <div className="page-content" role="tabpanel" id="panel-station" aria-labelledby="tab-station">
      <section className="page-title">
        <span className="eyebrow">MONITORING NETWORK</span>
        <h1>One station. Real measurements.</h1>
        <p>
          Information about the real-world monitoring location
          currently connected to AirMesh.
        </p>
      </section>

      <div className="station-detail-card">
        <div className="station-card-heading">
          <span className="station-symbol">
            <MapPin size={23} />
          </span>
          <span className="eyebrow">REGISTERED MONITORING LOCATION</span>
        </div>

        <h2>{stationData?.station || STATION.name}</h2>
        <p>{STATION.city}, {STATION.state}, India</p>

        <div className="quality-grid">
          <div>
            <small>PROVIDER</small>
            <strong>{stationData?.provider || 'CPCB'}</strong>
          </div>
          <div>
            <small>DATA SOURCE</small>
            <strong>{stationData?.source || 'OpenAQ'}</strong>
          </div>
          <div>
            <small>CURRENT</small>
            <strong>{currentCount}</strong>
          </div>
          <div>
            <small>STALE</small>
            <strong>{staleCount}</strong>
          </div>
        </div>

        <Accordion title="Technical station information">
          <div className="metadata-list">
            <div>
              <span>Invalid readings</span>
              <strong>{invalidCount}</strong>
            </div>
            <div>
              <span>Maximum reading age</span>
              <strong>{stationData?.freshness?.maximumAgeHours ?? 24} hours</strong>
            </div>
            <div>
              <span>Coordinates</span>
              <strong>{STATION.lat}, {STATION.lng}</strong>
            </div>
            <div>
              <span>Latest sensor reading</span>
              <strong>{formatTime(latestReading?.time)}</strong>
            </div>
            <div>
              <span>API fetched</span>
              <strong>{formatTime(stationData?.fetchedAt)}</strong>
            </div>
          </div>
        </Accordion>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LOCATION</span>
            <h2>Kadri, Mangaluru</h2>
            <p>Geographic location of the reporting monitoring station.</p>
          </div>
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
    </div>
  );
}
