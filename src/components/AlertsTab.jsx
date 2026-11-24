import React from 'react';
import {
  AlertCircle, ArrowUpRight, Bell, CheckCircle2,
  Clock, HeartPulse, Info, Mail, RefreshCw, Save,
  Settings, ShieldCheck
} from 'lucide-react';
import { POLLUTANTS, POLLUTANT_UNITS } from '../constants';

export default function AlertsTab({
  manageToken,
  manageLoading,
  manageSaving,
  manageStatus,
  manageError,
  handleSaveSettings,
  closeManageSettings,
  profile,
  setProfile,
  alertsEnabled,
  setAlertsEnabled,
  selectedPollutants,
  togglePollutant,
  thresholds,
  setThresholds,
  email,
  setEmail,
  subscribeLoading,
  subscribeStatus,
  handleSubscribe,
  settingsEmail,
  setSettingsEmail,
  settingsRequestLoading,
  settingsRequestStatus,
  handleRequestSettings
}) {
  const renderThresholdFields = () => (
    <div className="alert-threshold-list">
      {POLLUTANTS.map(item => {
        const selected = selectedPollutants.includes(item.id);

        return (
          <div
            className={`alert-threshold-row ${selected ? 'selected' : ''}`}
            key={item.id}
          >
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
      <div className="alert-profile-options" role="radiogroup" aria-label="Notification profile">
        <label className={`alert-profile-option ${profile === 'respiratory_sensitive' ? 'active' : ''}`}>
          <input
            type="radio"
            name="alert-profile"
            value="respiratory_sensitive"
            checked={profile === 'respiratory_sensitive'}
            onChange={() => setProfile('respiratory_sensitive')}
          />

          <span className="alert-profile-icon">
            <HeartPulse size={19} />
          </span>

          <span>
            <strong>Respiratory-sensitive</strong>
            <small>
              Starts with PM2.5 at 15 µg/m³. You can change this threshold.
            </small>
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

          <span className="alert-profile-icon">
            <Bell size={19} />
          </span>

          <span>
            <strong>General updates</strong>
            <small>
              Choose the pollutant measurements you want to follow.
            </small>
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

          <span className="alert-profile-icon">
            <Settings size={19} />
          </span>

          <span>
            <strong>Custom profile</strong>
            <small>
              Set your own pollutant selection and thresholds.
            </small>
          </span>
        </label>
      </div>

      <div className="alert-enable-row">
        <div>
          <strong>Enable daily notifications</strong>
          <small>Turn this off to pause your email alerts without unsubscribing.</small>
        </div>

        <label className="alert-switch">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={event => setAlertsEnabled(event.target.checked)}
            aria-label="Toggle daily email notifications"
          />
          <span />
        </label>
      </div>

      <div className="alert-threshold-heading">
        <div>
          <strong>Pollutant thresholds</strong>
          <small>
            Receive an email when a selected fresh reading is above your limit.
          </small>
        </div>
      </div>

      {renderThresholdFields()}

      <div className="info-note alert-info-note">
        <Info size={18} />
        <p>
          PM2.5's starting value of 15 µg/m³ is an indicative baseline setting,
          not a clinical diagnosis. Other pollutant thresholds
          are configured by you. Each pollutant maintains its own measurement unit.
        </p>
      </div>
    </>
  );

  return (
    <div className="page-content" role="tabpanel" id="panel-alerts" aria-labelledby="tab-alerts">
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
            <span className="alert-panel-icon">
              <Settings size={22} />
            </span>

            <div>
              <span className="eyebrow">SECURE SETTINGS LINK</span>
              <h2>Manage your notifications.</h2>
              <p>
                Update your profile, thresholds, or notification status.
              </p>
            </div>
          </div>

          {manageLoading ? (
            <div className="notice-card" role="status">
              <RefreshCw size={18} className="spin" />
              Loading your saved preferences...
            </div>
          ) : manageError && !manageStatus ? (
            <div className="notice-card error-card" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>Settings link unavailable</strong>
                <p>{manageError}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={closeManageSettings}
                >
                  Return to email alerts
                </button>
              </div>
            </div>
          ) : (
            <form
              className="alert-settings-form"
              onSubmit={handleSaveSettings}
            >
              {renderProfileControls()}

              <button
                className="solid-button alert-save-button"
                type="submit"
                disabled={manageSaving || manageLoading}
              >
                {manageSaving
                  ? 'Saving...'
                  : 'Save notification settings'}
                <Save size={16} />
              </button>

              {manageStatus && (
                <p className="form-message success-message" role="status">
                  {manageStatus}
                </p>
              )}

              {manageError && (
                <p className="form-message error-message" role="alert">
                  {manageError}
                </p>
              )}
            </form>
          )}

          <button
            type="button"
            className="alert-secondary-button"
            onClick={closeManageSettings}
          >
            Close settings
          </button>
        </div>
      ) : (
        <>
          <div className="alert-frequency-banner">
            <span className="alert-frequency-icon">
              <Clock size={20} />
            </span>

            <div>
              <strong>One scheduled check each day</strong>
              <p>
                AirMesh checks the latest eligible station readings once daily,
                approximately around 9:00 AM IST. This is a daily summary, not an instant warning sirens system.
              </p>
            </div>
          </div>

          <div className="email-layout">
            <div className="email-intro">
              <div className="cta-icon">
                <Mail size={24} />
              </div>

              <span className="eyebrow">
                PERSONAL AIR QUALITY UPDATES
              </span>

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
                Secure hashed link for managing preferences
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

            <form
              className="email-form alert-subscribe-form"
              onSubmit={handleSubscribe}
            >
              <span className="eyebrow">
                CREATE YOUR SUBSCRIPTION
              </span>

              <label htmlFor="subscriber-email">
                Email address
              </label>

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

              <span className="eyebrow">
                YOUR NOTIFICATION PREFERENCES
              </span>

              {renderProfileControls()}

              <button
                className="solid-button alert-save-button"
                type="submit"
                disabled={subscribeLoading}
              >
                {subscribeLoading
                  ? 'Sending confirmation...'
                  : 'Subscribe and verify'}
                <ArrowUpRight size={16} />
              </button>

              {subscribeStatus && (
                <p className="form-message" role="status">
                  {subscribeStatus}
                </p>
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

            <form
              className="alert-settings-request"
              onSubmit={handleRequestSettings}
            >
              <label htmlFor="settings-email">
                Subscribed email address
              </label>

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

                <button
                  className="outline-button"
                  type="submit"
                  disabled={settingsRequestLoading}
                >
                  {settingsRequestLoading
                    ? 'Sending...'
                    : 'Send settings link'}
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {settingsRequestStatus && (
                <p className="form-message" role="status">
                  {settingsRequestStatus}
                </p>
              )}
            </form>
          </section>

          <div className="info-note">
            <Info size={18} />
            <p>
              AirMesh currently monitors one station in Kadri, Mangaluru.
              Alerts use fresh readings from that station only.
              Every email includes a one-click unsubscribe link.
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
}
