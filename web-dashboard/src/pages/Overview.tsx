import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserX, BatteryCharging } from 'lucide-react';
import apiClient from '../api/client';

const activityData = [
  { name: 'Mon', active: 45, inactive: 5 },
  { name: 'Tue', active: 52, inactive: 3 },
  { name: 'Wed', active: 48, inactive: 8 },
  { name: 'Thu', active: 61, inactive: 2 },
  { name: 'Fri', active: 59, inactive: 4 },
  { name: 'Sat', active: 23, inactive: 40 },
  { name: 'Sun', active: 20, inactive: 45 },
];

const recentActivity = [
  { id: 1, user: 'Aarav Sharma', action: 'Checked In', location: 'Mumbai HQ', time: '10 mins ago', status: 'success' },
  { id: 2, user: 'Priya Patel', action: 'Low Battery', location: 'Delhi Route 4', time: '25 mins ago', status: 'warning' },
  { id: 3, user: 'Rahul Desai', action: 'Went Offline', location: 'Bangalore East', time: '1 hour ago', status: 'danger' },
  { id: 4, user: 'Sneha Reddy', action: 'Checked In', location: 'Hyderabad Central', time: '2 hours ago', status: 'success' },
];

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  offlineUsers: number;
  avgBattery: number;
}

const Overview: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiClient.get('/tracking/analytics');
        setAnalytics(response.data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1>Analytics Overview</h1>
        <p className="text-secondary">Track your workforce metrics in real-time.</p>
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
          <div className="kpi-icon-wrapper bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <BatteryCharging />
          </div>
          <div className="kpi-data">
            <h3>Avg Battery</h3>
            <p className="kpi-value">{analytics ? `${analytics.avgBattery}%` : '-'}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid mt-6">
        {/* Main Chart */}
        <div className="chart-card glass-panel">
          <h2>Weekly Activity Trends</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInactive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="active" stroke="#3b82f6" fillOpacity={1} fill="url(#colorActive)" />
                <Area type="monotone" dataKey="inactive" stroke="#ef4444" fillOpacity={1} fill="url(#colorInactive)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="table-card glass-panel">
          <h2>Recent Activity</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Action</th>
                  <th>Location</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td className="font-medium">{log.user}</td>
                    <td>
                      <span className={`status-badge badge-${log.status}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-secondary">{log.location}</td>
                    <td className="text-secondary text-sm">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
