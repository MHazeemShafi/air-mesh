import React, { useEffect, useMemo, useRef, useState } from 'react';
import GradientWave from './components/GradientWave';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import OverviewTab from './components/OverviewTab';
import PollutantsTab from './components/PollutantsTab';
import StationTab from './components/StationTab';
import HealthTab from './components/HealthTab';
import AlertsTab from './components/AlertsTab';

import {
  API_URL, REFRESH_INTERVAL, DEFAULT_THRESHOLDS,
  POLLUTANT_UNITS, NAV_ITEMS
} from './constants';
import {
  getReading, getAge, getFreshness,
  readJsonResponse, getApiMessage
} from './utils/formatters';

import 'leaflet/dist/leaflet.css';
import './alerts.css';

export default function App() {
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
      return new Date(current.time) > new Date(latest.time) ? current : latest;
    });
  }, [readings]);

  const pm25 = getReading(readings, 'pm25');
  const currentCount = stationData?.freshness?.currentReadings ?? readings.length;
  const staleCount = stationData?.freshness?.staleReadings ?? 0;
  const invalidCount = stationData?.freshness?.invalidReadings ?? 0;

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
          const val = data.thresholds?.[id]?.value;
          if (val !== undefined && val !== null) {
            nextThresholds[id] = String(val);
          }
        }

        setThresholds(nextThresholds);
        setManageStatus('Your current notification settings have loaded.');
      } catch (err) {
        if (!cancelled) {
          setManageError(err.message || 'Unable to load settings.');
        }
      } finally {
        if (!cancelled) {
          setManageLoading(false);
        }
      }
    };

    loadSettings();
    return () => { cancelled = true; };
  }, [manageToken]);

  const buildPreferences = () => {
    const cleanThresholds = {};

    if (selectedPollutants.length === 0) {
      throw new Error('Select at least one pollutant.');
    }

    for (const id of selectedPollutants) {
      const val = Number(thresholds[id]);
      if (!Number.isFinite(val) || val <= 0 || val > 100000) {
        throw new Error(`Enter a valid threshold for ${id.toUpperCase()}.`);
      }
      cleanThresholds[id] = {
        value: val,
        unit: POLLUTANT_UNITS[id]
      };
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
        body: JSON.stringify({ email: settingsEmail })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiMessage(data.error || data.message, 'Unable to request a settings link.')
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
      setSettingsRequestStatus(err.message || 'Unable to request a settings link.');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPollutantGrid = items => (
    <div className="pollutant-grid">
      {items.map(item => {
        const reading = getReading(readings, item.id);
        const Icon = item.icon;

        return (
          <article className="pollutant-item" key={item.id}>
            <span className="pollutant-icon">
              <Icon size={18} />
            </span>

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

  return (
    <>
      <GradientWave />

      <div className="airmesh-content">
        <div className="app-shell">
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activeTab={activeTab}
            changeTab={changeTab}
            status={status}
          />

          <main className="main-area">
            <Topbar
              activeTab={activeTab}
              status={status}
              refreshing={refreshing}
              fetchData={fetchData}
              setSidebarOpen={setSidebarOpen}
            />

            {activeTab === 'Overview' && (
              <OverviewTab
                stationData={stationData}
                status={status}
                error={error}
                refreshing={refreshing}
                fetchData={fetchData}
                lastFetch={lastFetch}
                latestReading={latestReading}
                pm25={pm25}
                freshness={freshness}
                currentCount={currentCount}
                staleCount={staleCount}
                invalidCount={invalidCount}
                changeTab={changeTab}
                renderPollutantGrid={renderPollutantGrid}
              />
            )}

            {activeTab === 'Pollutants' && (
              <PollutantsTab
                currentCount={currentCount}
                latestReading={latestReading}
                freshness={freshness}
                renderPollutantGrid={renderPollutantGrid}
              />
            )}

            {activeTab === 'Station' && (
              <StationTab
                stationData={stationData}
                currentCount={currentCount}
                staleCount={staleCount}
                invalidCount={invalidCount}
                latestReading={latestReading}
              />
            )}

            {activeTab === 'Health guidance' && (
              <HealthTab />
            )}

            {activeTab === 'Email alerts' && (
              <AlertsTab
                manageToken={manageToken}
                manageLoading={manageLoading}
                manageSaving={manageSaving}
                manageStatus={manageStatus}
                manageError={manageError}
                handleSaveSettings={handleSaveSettings}
                closeManageSettings={closeManageSettings}
                profile={profile}
                setProfile={setProfile}
                alertsEnabled={alertsEnabled}
                setAlertsEnabled={setAlertsEnabled}
                selectedPollutants={selectedPollutants}
                togglePollutant={togglePollutant}
                thresholds={thresholds}
                setThresholds={setThresholds}
                email={email}
                setEmail={setEmail}
                subscribeLoading={subscribeLoading}
                subscribeStatus={subscribeStatus}
                handleSubscribe={handleSubscribe}
                settingsEmail={settingsEmail}
                setSettingsEmail={setSettingsEmail}
                settingsRequestLoading={settingsRequestLoading}
                settingsRequestStatus={settingsRequestStatus}
                handleRequestSettings={handleRequestSettings}
              />
            )}
          </main>

          <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile Navigation">
            {NAV_ITEMS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                className={activeTab === name ? 'active' : ''}
                onClick={() => changeTab(name)}
                aria-label={name}
              >
                <Icon size={18} aria-hidden="true" />
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
      </div>
    </>
  );
}
