import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Search, Edit, Trash2, Download, Navigation, X, Check } from 'lucide-react';
import apiClient from '../api/client';

interface MobileDevice {
  id: string;
  deviceId: string;
  userId: string;
  latitude?: number;
  longitude?: number;
  lastLocationAt?: string;
  status: boolean;
  createdAt?: string;
  _count?: {
    locationLogs: number;
  };
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [editingDevice, setEditingDevice] = useState<MobileDevice | null>(null);
  const [editUserId, setEditUserId] = useState('');

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
      await apiClient.patch(`/mobile-users/${editingDevice.id}`, {
        userId: editUserId,
      });
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      console.error('Failed to update device user ID', err);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this device registration?')) return;
    try {
      await apiClient.delete(`/mobile-users/${id}`);
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete device', err);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="glass-panel max-w-md w-full p-6 relative">
            <button
              onClick={() => setSelectedDevice(null)}
              className="absolute top-4 right-4 text-secondary hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Device Info</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-secondary mb-1">Android Hardware ID (`ANDROID_ID`)</p>
                <p className="font-mono text-lg text-blue-400 break-all">{selectedDevice.deviceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary">User ID</p>
                  <p className="text-white font-mono font-medium">{selectedDevice.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Status</p>
                  <p className="text-white">{selectedDevice.status ? 'Active' : 'Offline'}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Total Location Logs</p>
                  <p className="text-white">{selectedDevice._count?.locationLogs ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User ID Modal */}
      {editingDevice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="glass-panel max-w-md w-full p-6 relative">
            <button
              onClick={() => setEditingDevice(null)}
              className="absolute top-4 right-4 text-secondary hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit User ID</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Custom User ID</label>
                <input
                  type="text"
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="e.g. USR-1001"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
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
                <tr key={dev.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-blue-400" />
                      <span className="font-mono font-medium text-white">{dev.userId}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="text-blue-400 hover:underline font-mono text-xs"
                      onClick={() => setSelectedDevice(dev)}
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
                        onClick={() => navigate(`/dashboard/map?userId=${dev.id}`)}
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
