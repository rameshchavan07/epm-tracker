import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Download, Navigation, X, Check, Clock, UserCheck } from 'lucide-react';
import apiClient from '../api/client';

interface FaceProfile {
  referenceImage?: string;
  registered_face_image?: string;
  lastLoginImage?: string | null;
  last_login_image?: string | null;
  lastVerifiedAt?: string | null;
}

interface MobileDevice {
  employee_code: string;
  device_id: string;
  deviceId?: string;
  name?: string;
  status: boolean;
  login_status?: string;
  lastLocationAt?: string;
  createdAt?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  faceProfile?: FaceProfile | null;
}

interface LocationHistoryItem {
  id: string;
  employee_code?: string;
  lat: number;
  lng: number;
  recorded_date_time: string;
  accuracy?: number;
  address?: string | null;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);

  // Location History State
  const [historyModalUser, setHistoryModalUser] = useState<MobileDevice | null>(null);
  const [historyLogs, setHistoryLogs] = useState<LocationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Global Tracking Config States
  const [trackingInterval, setTrackingInterval] = useState(2);
  const [faceVerificationInterval, setFaceVerificationInterval] = useState(120);
  const [faceVerificationGracePeriod, setFaceVerificationGracePeriod] = useState(5);
  const [savingInterval, setSavingInterval] = useState(false);
  const [intervalSavedMsg, setIntervalSavedMsg] = useState('');

  const fetchTrackingConfig = async () => {
    try {
      const res = await apiClient.get('/tracking/config');
      if (res.data) {
        if (res.data.trackingIntervalMinutes) {
          setTrackingInterval(res.data.trackingIntervalMinutes);
        }
        if (res.data.faceVerificationIntervalMinutes) {
          setFaceVerificationInterval(res.data.faceVerificationIntervalMinutes);
        }
        if (res.data.faceVerificationGracePeriodMinutes) {
          setFaceVerificationGracePeriod(res.data.faceVerificationGracePeriodMinutes);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tracking config', err);
    }
  };

  const handleSaveConfig = async (
    newInterval: number,
    newFaceInterval: number,
    newGracePeriod: number
  ) => {
    setSavingInterval(true);
    setIntervalSavedMsg('');
    try {
      const res = await apiClient.post('/tracking/config', {
        trackingIntervalMinutes: newInterval,
        faceVerificationIntervalMinutes: newFaceInterval,
        faceVerificationGracePeriodMinutes: newGracePeriod,
      });
      if (res.data) {
        setTrackingInterval(res.data.trackingIntervalMinutes);
        setFaceVerificationInterval(res.data.faceVerificationIntervalMinutes);
        setFaceVerificationGracePeriod(res.data.faceVerificationGracePeriodMinutes);
        setIntervalSavedMsg('Settings updated!');
        setTimeout(() => setIntervalSavedMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to update configuration', err);
    } finally {
      setSavingInterval(false);
    }
  };

  const fetchDevices = async () => {
    try {
      let response;
      try {
        response = await apiClient.get('/employees');
      } catch {
        response = await apiClient.get('/mobile-users');
      }
      if (response && response.data) {
        const formatted = response.data.map((item: any) => ({
          employee_code: item.employee_code || item.userId || 'EMP001',
          device_id: item.device_id || item.deviceId || 'unknown',
          deviceId: item.device_id || item.deviceId || 'unknown',
          name: item.name || `Employee ${item.employee_code || item.userId || ''}`,
          status: item.login_status ? item.login_status === 'Y' : Boolean(item.status),
          login_status: item.login_status || (item.status ? 'Y' : 'N'),
          lastLocationAt: item.lastLocationAt,
          createdAt: item.createdAt,
          address: item.address,
          lat: item.lat,
          lng: item.lng,
          faceProfile: item.faceProfile,
        }));
        setDevices(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch employee devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchTrackingConfig();
  }, []);

  const handleExportCSV = () => {
    if (!devices || devices.length === 0) {
      alert('No employee data available to export.');
      return;
    }

    const headers = ['Employee Code', 'Employee Name', 'Device ID', 'Login Status', 'Last Address', 'Last Latitude', 'Last Longitude', 'Last Ping'];
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...devices.map(dev =>
        `"${(dev.employee_code || 'N/A').replace(/"/g, '""')}","${(dev.name || 'N/A').replace(/"/g, '""')}","${(dev.device_id || 'N/A').replace(/"/g, '""')}","${dev.status ? 'Active (Y)' : 'Offline (N)'}","${(dev.address || 'N/A').replace(/"/g, '""')}",${dev.lat ?? 'N/A'},${dev.lng ?? 'N/A'},"${dev.lastLocationAt ? new Date(dev.lastLocationAt).toLocaleString() : 'Never'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'hrms_employee_devices_export.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleDeleteDevice = async (employeeCode: string, deviceId: string) => {
    if (!window.confirm(`Are you sure you want to remove registration for Employee ${employeeCode}?`)) return;
    try {
      await apiClient.delete(`/employees/${employeeCode}/${deviceId}`);
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
  };

  const handleOpenHistory = async (device: MobileDevice) => {
    setHistoryModalUser(device);
    setLoadingHistory(true);
    setHistoryLogs([]);
    try {
      const targetId = device.employee_code || device.device_id;
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

  const handleDownloadUserHistoryCsv = () => {
    if (!historyModalUser || !historyLogs || historyLogs.length === 0) return;

    const headers = ['Employee Code', 'Device ID', 'Recorded Date & Time', 'Location Address', 'Latitude', 'Longitude', 'Accuracy (m)'];
    const rows = historyLogs.map(log => [
      `"${(historyModalUser.employee_code || 'N/A').replace(/"/g, '""')}"`,
      `"${(historyModalUser.device_id || 'N/A').replace(/"/g, '""')}"`,
      `"${new Date(log.recorded_date_time).toLocaleString()}"`,
      `"${(log.address || 'N/A').replace(/"/g, '""')}"`,
      log.lat,
      log.lng,
      log.accuracy ? `±${Math.round(log.accuracy)}m` : 'N/A'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${historyModalUser.employee_code}_location_history.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const filteredDevices = devices.filter(dev => {
    const query = searchQuery.toLowerCase();
    return (
      dev.employee_code.toLowerCase().includes(query) ||
      dev.device_id.toLowerCase().includes(query) ||
      (dev.name && dev.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>HRMS Employee Field Devices</h1>
          <p className="text-secondary">Manage HRMS employee profiles, login status, and field telemetry.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportCSV}>
            <Download className="btn-icon inline-block mr-2" /> Export CSV
          </button>
        </div>
      </header>

      {/* Global Configuration Panel */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Clock size={22} style={{ color: '#6366f1' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Global HRMS System Setup</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Configure tracking frequency, face verification intervals, and session grace periods from system_setup_table.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
          {/* Tracking Frequency */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Location Collection Frequency</label>
            <select
              value={trackingInterval}
              onChange={(e) => handleSaveConfig(Number(e.target.value), faceVerificationInterval, faceVerificationGracePeriod)}
              disabled={savingInterval}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '0.9rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={1}>⚡ 1 Minute (High Precision)</option>
              <option value={2}>⚡ 2 Minutes (Standard)</option>
              <option value={5}>⚡ 5 Minutes (Balanced)</option>
              <option value={10}>⚡ 10 Minutes (Battery Saver)</option>
              <option value={15}>⚡ 15 Minutes (Low Power)</option>
            </select>
          </div>

          {/* Face Verification Frequency */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Face Verification Frequency</label>
            <select
              value={faceVerificationInterval}
              onChange={(e) => handleSaveConfig(trackingInterval, Number(e.target.value), faceVerificationGracePeriod)}
              disabled={savingInterval}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '0.9rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={15}>🔒 15 Minutes (Testing)</option>
              <option value={30}>🔒 30 Minutes</option>
              <option value={60}>🔒 1 Hour</option>
              <option value={120}>🔒 2 Hours (Standard)</option>
              <option value={240}>🔒 4 Hours</option>
              <option value={480}>🔒 8 Hours</option>
            </select>
          </div>

          {/* Verification Grace Period */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Verification Grace Period</label>
            <select
              value={faceVerificationGracePeriod}
              onChange={(e) => handleSaveConfig(trackingInterval, faceVerificationInterval, Number(e.target.value))}
              disabled={savingInterval}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '0.9rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={1}>⏳ 1 Minute</option>
              <option value={2}>⏳ 2 Minutes</option>
              <option value={3}>⏳ 3 Minutes</option>
              <option value={5}>⏳ 5 Minutes (Standard)</option>
              <option value={10}>⏳ 10 Minutes</option>
              <option value={15}>⏳ 15 Minutes</option>
            </select>
          </div>
        </div>

        {intervalSavedMsg && (
          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} /> {intervalSavedMsg}
          </div>
        )}
      </div>

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
              <h2 style={{ marginBottom: '16px' }}>Employee & Device Info</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '4px' }}>Device ID (`device_id`)</p>
                <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#60a5fa', wordBreak: 'break-all' }}>{selectedDevice.device_id}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>Employee Code</p>
                  <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px' }}>{selectedDevice.employee_code}</p>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>Employee Name</p>
                  <p style={{ color: '#fff', fontWeight: 600 }}>{selectedDevice.name}</p>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '14px' }}>Login Status (`login_status`)</p>
                  <p style={{ color: selectedDevice.status ? '#34d399' : '#f87171', fontWeight: 700 }}>
                    {selectedDevice.status ? 'Active (Y)' : 'Offline (N)'}
                  </p>
                </div>
              </div>

              {/* Face Biometric Profiles Section */}
              {selectedDevice.faceProfile ? (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                  <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>Registered Biometric Profile</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Registered Face Image */}
                    <div>
                      <p className="text-secondary" style={{ fontSize: '12px', marginBottom: '8px' }}>Registered Face Image</p>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b' }}>
                        {(selectedDevice.faceProfile.registered_face_image || selectedDevice.faceProfile.referenceImage) ? (
                          <img 
                            src={(selectedDevice.faceProfile.registered_face_image || selectedDevice.faceProfile.referenceImage || '').startsWith('data:') ? (selectedDevice.faceProfile.registered_face_image || selectedDevice.faceProfile.referenceImage) : `data:image/jpeg;base64,${selectedDevice.faceProfile.registered_face_image || selectedDevice.faceProfile.referenceImage}`} 
                            alt="Registered reference" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No photo</div>
                        )}
                      </div>
                    </div>

                    {/* Last Login Image */}
                    <div>
                      <p className="text-secondary" style={{ fontSize: '12px', marginBottom: '8px' }}>
                        Last Login Image
                        {selectedDevice.faceProfile.lastVerifiedAt && (
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '2px' }}>
                            {new Date(selectedDevice.faceProfile.lastVerifiedAt).toLocaleString()}
                          </span>
                        )}
                      </p>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b' }}>
                        {(selectedDevice.faceProfile.last_login_image || selectedDevice.faceProfile.lastLoginImage) ? (
                          <img 
                            src={(selectedDevice.faceProfile.last_login_image || selectedDevice.faceProfile.lastLoginImage || '')} 
                            alt="Last login photo" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', padding: '8px' }}>
                            No verification photo yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  No face registration profile active on server.
                </div>
              )}
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
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ marginBottom: '4px' }}>Location History</h2>
                <p className="text-secondary" style={{ fontSize: '14px', margin: 0 }}>
                  Showing recent location pings for <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>{historyModalUser.employee_code}</span> ({historyModalUser.name})
                </p>
              </div>
              {historyLogs.length > 0 && (
                <button
                  onClick={handleDownloadUserHistoryCsv}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '8px 14px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                  }}
                >
                  <Download size={15} /> Download History CSV
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {loadingHistory ? (
                <div className="flex-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>Loading history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="flex-center" style={{ padding: '48px 0', color: 'var(--text-secondary)' }}>No location history found for this employee.</div>
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
                          {new Date(log.recorded_date_time).toLocaleString()}
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
              placeholder="Search Employee Code, Name, or Device ID..."
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
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Device ID</th>
                <th>Login Status</th>
                <th>Last Location Ping</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">Loading employees...</td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">No registered employee devices found.</td>
                </tr>
              ) : filteredDevices.map((dev) => (
                <tr key={`${dev.employee_code}_${dev.device_id}`}>
                  <td>
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-blue-400" />
                      <button
                        className="font-mono font-bold text-white hover:text-blue-400 hover:underline text-left transition-colors"
                        onClick={() => handleOpenHistory(dev)}
                        title="View Location History"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {dev.employee_code}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className="font-medium text-white">{dev.name}</span>
                  </td>
                  <td>
                    <button
                      className="text-blue-400 hover:underline font-mono text-xs text-left"
                      onClick={() => setSelectedDevice(dev)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {dev.device_id}
                    </button>
                  </td>
                  <td>
                    <span className={`status-badge ${dev.status ? 'active' : 'offline'}`}>
                      {dev.status ? 'Active (Y)' : 'Offline (N)'}
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
                        onClick={() => navigate(`/dashboard/map?userId=${dev.employee_code}`)}
                      >
                        <Navigation size={16} />
                      </button>
                      <button
                        className="icon-btn text-red-400"
                        title="Delete Employee Device Profile"
                        onClick={() => handleDeleteDevice(dev.employee_code, dev.device_id)}
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
