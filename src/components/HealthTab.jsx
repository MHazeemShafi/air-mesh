import React from 'react';
import { Clock, Cloud, HeartPulse, Info, Leaf } from 'lucide-react';

export default function HealthTab() {
  return (
    <div className="page-content" role="tabpanel" id="panel-health" aria-labelledby="tab-health">
      <section className="page-title">
        <span className="eyebrow">ENVIRONMENT & WELLBEING</span>
        <h1>Understand your exposure.</h1>
        <p>
          General information to help interpret air-quality measurements.
          This is educational guidance, not a personal medical assessment.
        </p>
      </section>

      <div className="guidance-intro">
        <div className="guidance-intro-icon">
          <Leaf size={25} />
        </div>

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
          <div>
            <span className="eyebrow">01 / UNDERSTANDING PM2.5</span>
            <h2>Why fine particles matter</h2>
            <p>Learn what this measurement represents.</p>
          </div>
        </div>

        <div className="guidance-grid">
          <article className="guidance-card">
            <span className="guidance-card-icon">
              <Cloud size={20} />
            </span>
            <h3>Fine particles</h3>
            <p>
              PM2.5 refers to airborne particles with a diameter
              of 2.5 micrometres or smaller. These particles can
              travel deep into the respiratory system.
            </p>
          </article>

          <article className="guidance-card">
            <span className="guidance-card-icon">
              <HeartPulse size={20} />
            </span>
            <h3>Individual sensitivity</h3>
            <p>
              Some people may be more sensitive to pollution.
              Personal health needs and medical advice should
              guide individual decisions.
            </p>
          </article>

          <article className="guidance-card">
            <span className="guidance-card-icon">
              <Clock size={20} />
            </span>
            <h3>Check measurement time</h3>
            <p>
              Always consider when a measurement was recorded.
              A delayed reading may not represent current
              outdoor conditions.
            </p>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / PRACTICAL AWARENESS</span>
            <h2>Things worth checking</h2>
            <p>Useful considerations when reviewing local readings.</p>
          </div>
        </div>

        <div className="guidance-list">
          <div>
            <span>01</span>
            <section>
              <strong>Check the timestamp</strong>
              <p>
                Look at the sensor measurement time, not just
                when the website refreshed.
              </p>
            </section>
          </div>

          <div>
            <span>02</span>
            <section>
              <strong>Look beyond one pollutant</strong>
              <p>
                Different pollutants have different sources
                and health considerations.
              </p>
            </section>
          </div>

          <div>
            <span>03</span>
            <section>
              <strong>Consider your surroundings</strong>
              <p>
                Traffic, construction, weather and indoor
                sources can affect exposure.
              </p>
            </section>
          </div>

          <div>
            <span>04</span>
            <section>
              <strong>Follow professional advice</strong>
              <p>
                People with existing health conditions should
                follow guidance from their healthcare professional.
              </p>
            </section>
          </div>
        </div>
      </section>

      <div className="info-note">
        <Info size={18} />
        <p>
          AirMesh currently displays measurements from one monitoring station in Kadri.
          These readings do not represent every neighbourhood or indoor
          environment in Mangaluru. This application does not diagnose, predict,
          or treat health conditions.
        </p>
      </div>
    </div>
  );
}
