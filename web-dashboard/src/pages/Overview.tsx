import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, MapPin, Download } from 'lucide-react';
import apiClient from '../api/client';
import { exportTeamAttendanceCsv } from '../utils/exportCsv';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  offlineUsers: number;
  totalLogsToday: number;
}

interface LatestLocation {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'Offline';
  lat: number;
  lng: number;
  recordedAt: string;
}

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentLocations, setRecentLocations] = useState<LatestLocation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, locationsRes] = await Promise.all([
          apiClient.get('/tracking/analytics'),
          apiClient.get('/tracking/latest'),
        ]);
        setAnalytics(analyticsRes.data);
        setRecentLocations(locationsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get('/tracking/latest');
      if (response.data) {
        exportTeamAttendanceCsv(response.data);
      }
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Analytics Overview</h1>
          <p className="text-secondary">Real-time presence metrics and system activity</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="btn-primary"
          style={{
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
          }}
        >
          <Download size={16} /> Export CSV Report
        </button>
      </header>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Users />
          </div>
          <div className="kpi-data">
            <h3>Total Employees</h3>
            <p className="kpi-value">{analytics ? analytics.totalUsers : '-'}</p>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <UserCheck />
          </div>
          <div className="kpi-data">
            <h3>Active Now</h3>
            <p className="kpi-value">{analytics ? analytics.activeUsers : '-'}</p>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper bg-red-500/20 text-red-400 border border-red-500/30">
            <UserX />
          </div>
          <div className="kpi-data">
            <h3>Offline</h3>
            <p className="kpi-value">{analytics ? analytics.offlineUsers : '-'}</p>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrapper bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <MapPin />
          </div>
          <div className="kpi-data">
            <h3>Pings Today</h3>
            <p className="kpi-value">{analytics ? analytics.totalLogsToday : '-'}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid mt-6" style={{ gridTemplateColumns: '1fr' }}>
        {/* Recent Activity Table */}
        <div className="table-card glass-panel">
          <h2>Latest Location Pings</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Coordinates</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {recentLocations.length > 0 ? (
                  recentLocations.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => navigate(`/dashboard/map?userId=${log.id}`)}
                      style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="font-medium">{log.name}</td>
                      <td className="text-secondary text-sm">
                        {log.lat.toFixed(4)}, {log.lng.toFixed(4)}
                      </td>
                      <td>
                        <span className={`status-badge badge-${log.status === 'Active' ? 'success' : 'danger'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="text-secondary text-sm">{formatTime(log.recordedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No recent location activity found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
