import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Search, Edit, Trash2, Download, Navigation, X, Check } from 'lucide-react';
import apiClient from '../api/client';

interface MobileDevice {
  deviceId: string;
  userId: string;
  status: boolean;
  lastLocationAt?: string;
  createdAt?: string;
  _count?: {
    locationLogs: number;
  };
}

interface LocationHistoryItem {
  id: string;
  lat: number;
  lng: number;
  recordedAt: string;
  accuracy?: number;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [editingDevice, setEditingDevice] = useState<MobileDevice | null>(null);
  const [editUserId, setEditUserId] = useState('');

  // Location History State
  const [historyModalUser, setHistoryModalUser] = useState<MobileDevice | null>(null);
  const [historyLogs, setHistoryLogs] = useState<LocationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchDevices = async () => {
    try {
      const response = await apiClient.get('/mobile-users');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to fetch mobile devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleExportCSV = () => {
    const headers = ['User ID', 'Device Hardware ID (ANDROID_ID)', 'Status', 'Last Ping'];
    const csvContent = [
      headers.join(','),
      ...devices.map(dev =>
        `"${dev.userId}","${dev.deviceId}","${dev.status ? 'Active' : 'Offline'}","${dev.lastLocationAt ? new Date(dev.lastLocationAt).toLocaleString() : 'Never'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mobile_devices_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = async () => {
    if (!editingDevice) return;
    try {
      await apiClient.patch(`/mobile-users/${editingDevice.deviceId}`, {
        userId: editUserId,
      });
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      console.error('Failed to update device user ID', err);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to remove this device registration?')) return;
    try {
      await apiClient.delete(`/mobile-users/${deviceId}`);
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete device', err);
    }
  };

  const handleOpenHistory = async (device: MobileDevice) => {
    setHistoryModalUser(device);
    setLoadingHistory(true);
    setHistoryLogs([]);
    try {
      const targetId = device.deviceId || device.userId;
      // Use limit to fetch most recent 100 location logs
      const response = await apiClient.get(`/tracking/history/${targetId}?limit=100`);
      if (response.data && Array.isArray(response.data)) {
        setHistoryLogs(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch location history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredDevices = devices.filter(dev => {
    const query = searchQuery.toLowerCase();
    return (
      dev.deviceId.toLowerCase().includes(query) ||
      (dev.userId && dev.userId.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Mobile Tracking Devices</h1>
          <p className="text-secondary">Manage login-free Android tracking devices and auto-generated user IDs.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportCSV}>
            <Download className="btn-icon inline-block mr-2" /> Export CSV
          </button>
        </div>
      </header>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => setSelectedDevice(null)}
              className="modal-close"
            >
              <X size={20} />
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: '16px' }}>Device Info</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '4px' }}>Android Hardware ID (`ANDROID_ID`)</p>
                <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#60a5fa', wordBreak: 'break-all' }}>{selectedDevice.deviceId}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>User ID</p>
                  <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 500 }}>{selectedDevice.userId}</p>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>Status</p>
                  <p style={{ color: '#fff' }}>{selectedDevice.status ? 'Active' : 'Offline'}</p>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>Total Location Logs</p>
                  <p style={{ color: '#fff' }}>{selectedDevice._count?.locationLogs ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User ID Modal */}
      {editingDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => setEditingDevice(null)}
              className="modal-close"
            >
              <X size={20} />
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: '16px' }}>Edit User ID</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-secondary" style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Custom User ID</label>
                <input
                  type="text"
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: 'monospace' }}
                  placeholder="e.g. USR-1001"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setEditingDevice(null)}>
                  Cancel
                </button>
                <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSaveEdit}>
                  <Check size={16} className="inline mr-1" /> Save User ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location History Modal */}
      {historyModalUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setHistoryModalUser(null)}
              className="modal-close"
            >
              <X size={20} />
            </button>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ marginBottom: '8px' }}>Location History</h2>
              <p className="text-secondary" style={{ fontSize: '14px', margin: 0 }}>
                Showing recent location pings for <span style={{ fontFamily: 'monospace', color: '#fff' }}>{historyModalUser.userId}</span>
              </p>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {loadingHistory ? (
                <div className="flex-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>Loading history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="flex-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>No location history found for this user.</div>
              ) : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      <th style={{ paddingBottom: '12px', fontWeight: 600 }}>Date & Time</th>
                      <th style={{ paddingBottom: '12px', fontWeight: 600 }}>Latitude</th>
                      <th style={{ paddingBottom: '12px', fontWeight: 600 }}>Longitude</th>
                      <th style={{ paddingBottom: '12px', fontWeight: 600 }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '14px 0', fontSize: '14px', color: '#fff' }}>
                          {new Date(log.recordedAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 0', fontSize: '14px', fontFamily: 'monospace', color: '#60a5fa' }}>{log.lat.toFixed(6)}</td>
                        <td style={{ padding: '14px 0', fontSize: '14px', fontFamily: 'monospace', color: '#60a5fa' }}>{log.lng.toFixed(6)}</td>
                        <td style={{ padding: '14px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {log.accuracy ? `±${Math.round(log.accuracy)}m` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="table-card glass-panel mt-6">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search User ID or Hardware ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Device Hardware ID</th>
                <th>Status</th>
                <th>Last Location Ping</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">Loading devices...</td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">No registered mobile devices found.</td>
                </tr>
              ) : filteredDevices.map((dev) => (
                <tr key={dev.deviceId}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-blue-400" />
                      <button
                        className="font-mono font-medium text-white hover:text-blue-400 hover:underline text-left transition-colors"
                        onClick={() => handleOpenHistory(dev)}
                        title="View Location History"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {dev.userId}
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      className="text-blue-400 hover:underline font-mono text-xs text-left"
                      onClick={() => setSelectedDevice(dev)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {dev.deviceId}
                    </button>
                  </td>
                  <td>
                    <span className={`status-badge ${dev.status ? 'active' : 'offline'}`}>
                      {dev.status ? 'Active' : 'Offline'}
                    </span>
                  </td>
                  <td className="text-secondary text-sm">
                    {dev.lastLocationAt ? new Date(dev.lastLocationAt).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="icon-btn text-blue-400"
                        title="View Travel Route"
                        onClick={() => navigate(`/dashboard/map?userId=${dev.deviceId}`)}
                      >
                        <Navigation size={16} />
                      </button>
                      <button
                        className="icon-btn text-blue-400"
                        title="Edit User ID"
                        onClick={() => {
                          setEditingDevice(dev);
                          setEditUserId(dev.userId || '');
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="icon-btn text-red-400"
                        title="Delete Device"
                        onClick={() => handleDeleteDevice(dev.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;
