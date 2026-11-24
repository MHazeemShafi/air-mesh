import React from 'react';
import { Info } from 'lucide-react';
import { POLLUTANTS, WEATHER } from '../constants';
import { formatTime } from '../utils/formatters';

export default function PollutantsTab({
  currentCount,
  latestReading,
  freshness,
  renderPollutantGrid
}) {
  return (
    <div className="page-content" role="tabpanel" id="panel-pollutants" aria-labelledby="tab-pollutants">
      <section className="page-title">
        <span className="eyebrow">SENSOR MEASUREMENTS</span>
        <h1>Explore the readings.</h1>
        <p>
          Individual measurements reported by the Kadri monitoring station.
          Values are displayed in the official units supplied by the source.
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
            {latestReading
              ? formatTime(latestReading.time)
              : 'Unavailable'}
          </strong>
          <small>{freshness}</small>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / AIR POLLUTANTS</span>
            <h2>Pollutant measurements</h2>
            <p>Explore the available particulate matter and gaseous readings.</p>
          </div>
        </div>

        {renderPollutantGrid(POLLUTANTS)}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / ENVIRONMENT</span>
            <h2>Weather measurements</h2>
            <p>Additional atmospheric and meteorological readings from the station.</p>
          </div>
        </div>

        {renderPollutantGrid(WEATHER)}
      </section>

      <div className="info-note">
        <Info size={18} />
        <p>
          Missing readings are not treated as zero. Measurements use
          the units supplied by OpenAQ. This page presents individual sensor readings
          and does not calculate an official composite CPCB AQI.
        </p>
      </div>
    </div>
  );
}
