import { Menu, RefreshCw } from 'lucide-react';

export default function Topbar({
  activeTab,
  status,
  refreshing,
  fetchData,
  setSidebarOpen
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation sidebar"
        >
          <Menu size={19} />
        </button>

        <div className="breadcrumb">
          <span>AirMesh</span>
          <b>/</b>
          {activeTab}
        </div>
      </div>

      <div className="topbar-actions">
        <span className={`connection-status ${status}`}>
          <span />
          {status === 'available'
            ? 'DATA AVAILABLE'
            : status.toUpperCase()}
        </span>

        <button
          type="button"
          className="icon-action"
          onClick={fetchData}
          disabled={refreshing}
          title="Refresh air quality sensor data"
          aria-label="Refresh air quality sensor data"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'spin' : ''}
          />
        </button>
      </div>
    </header>
  );
}
