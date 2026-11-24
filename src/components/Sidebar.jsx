import React from 'react';
import { X } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  changeTab,
  status
}) {
  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}
        aria-label="Primary navigation"
      >
        <div className="brand-row">
          <div className="brand-symbol">
            <span />
            <span />
            <span />
          </div>

          <div className="brand-name">
            AirMesh<span>.</span>
          </div>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="brand-caption">
          ENVIRONMENTAL INTELLIGENCE
        </div>

        <div className="side-divider" />

        <div className="side-label">YOUR LOCATION</div>

        <div className="workspace-chip">
          <span className="workspace-dot" />
          <span>Mangaluru, Karnataka</span>
        </div>

        <div className="side-label nav-heading">
          NAVIGATION
        </div>

        <nav className="side-nav" role="tablist" aria-label="Sections">
          {NAV_ITEMS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              id={`tab-${name.toLowerCase().replace(/\s+/g, '-')}`}
              role="tab"
              aria-selected={activeTab === name}
              aria-controls={`panel-${name.toLowerCase().replace(/\s+/g, '-')}`}
              className={`nav-link ${activeTab === name ? 'active' : ''}`}
              onClick={() => changeTab(name)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="demo-state">
            <span
              className={`demo-dot ${status === 'available' ? 'connected' : ''}`}
            />

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
    </>
  );
}
