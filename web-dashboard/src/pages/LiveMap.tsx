import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Circle,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Users,
  X,
  Navigation,
  History,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  Compass,
  Camera,
  ExternalLink,
  Download,
} from 'lucide-react';
import L from 'leaflet';
import { calculateRouteMetrics } from '../utils/travelMetrics';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper function: Ramer-Douglas-Peucker (RDP) algorithm for polyline route smoothing
function simplifyPolyline(points: [number, number][], epsilon: number = 0.00003): [number, number][] {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  const p1 = points[0];
  const p2 = points[end];

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], p1, p2);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = simplifyPolyline(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyPolyline(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [p1, p2];
  }
}

function perpendicularDistance(p: [number, number], p1: [number, number], p2: [number, number]): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - p1[0], p[1] - p1[1]);
  const norm = Math.hypot(dx, dy);
  return Math.abs(dy * p[0] - dx * p[1] + p2[0] * p1[1] - p2[1] * p1[0]) / norm;
}

// Component to dynamically change map center
const ChangeView: React.FC<{ center: [number, number]; zoom?: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center, map, zoom]);
  return null;
};

// Component to fix Leaflet gray/white space when parent container resizes
const ResizeMap: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    return () => clearTimeout(timeout);
  }, [isSidebarOpen, map]);
  return null;
};

interface LocationHistoryItem {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  address?: string;
  intervalMinutes?: number;
  recordedAt: string;
}

const LiveMap: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [employees, setEmployees] = useState<any[]>([]);
  const [activeEmployee, setActiveEmployee] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Map State
  const [mapStyle, setMapStyle] = useState<'osm' | 'street' | 'satellite'>('osm');
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    20.5937, 78.9629,
  ]); // Default to center of India
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

  // Route Playback & History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<LocationHistoryItem[]>([]);
  const [playbackStep, setPlaybackStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 360° Street View Modal State
  const [streetViewModal, setStreetViewModal] = useState<{
    isOpen: boolean;
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await apiClient.get('/tracking/latest');
        if (response.data && response.data.length > 0) {
          setEmployees(response.data);
          
          let selected = response.data[0];
          if (targetUserId) {
            const found = response.data.find((e: any) => e.id === targetUserId);
            if (found) selected = found;
          }
          setActiveEmployee(selected);
          setMapCenter([selected.lat, selected.lng]);

          if (targetUserId) {
            setShowHistory(true);
            fetchRouteHistory(selected.deviceId || selected.id || selected.userId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial locations', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();

    // Setup Socket.io Real-Time Live Streaming Listener
    let socket: any;
    import('socket.io-client').then(({ io }) => {
      socket = io('http://localhost:3000');
      socket.on('connect', () => {
        console.log('Connected to WebSocket Live Location Gateway');
      });

      socket.on('locationUpdate', (updatedUser: any) => {
        setEmployees((prev) => {
          const index = prev.findIndex((e) => e.id === updatedUser.id);
          if (index !== -1) {
            const next = [...prev];
            // Merge the update — lat/lng may be null when user goes offline
            next[index] = { ...next[index], ...updatedUser };
            return next;
          }
          // Only add new entry if it has a valid position
          if (updatedUser.lat != null && updatedUser.lng != null) {
            return [updatedUser, ...prev];
          }
          return prev;
        });
      });
    });

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (error) => {
          console.warn(
            'Could not get location, using default coordinates.',
            error,
          );
          setMapCenter([20.5937, 78.9629]);
        },
        { enableHighAccuracy: true },
      );
    }

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Fetch route history when toggling or changing active employee
  const fetchRouteHistory = async (userId: string, date?: string) => {
    try {
      // Pass the date filter so only that day's records come back
      const params = date ? `?date=${date}&limit=500` : '?limit=500';
      const response = await apiClient.get(`/tracking/history/${userId}${params}`);
      if (response.data && Array.isArray(response.data)) {
        // Reverse so chronologically ordered (oldest to newest)
        const sorted = [...response.data].reverse();
        setHistoryLogs(sorted);
        setPlaybackStep(sorted.length - 1);
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          setMapCenter([last.lat, last.lng]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch route history', err);
    }
  };

  // Auto playback animation timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && historyLogs.length > 0) {
      timer = setInterval(() => {
        setPlaybackStep((prev) => {
          if (prev >= historyLogs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, historyLogs]);

  const handleEmployeeClick = (emp: any) => {
    setActiveEmployee(emp);
    setMapCenter([emp.lat, emp.lng]);
    if (showHistory) {
      void fetchRouteHistory(emp.deviceId || emp.id || emp.userId);
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const toggleHistoryMode = () => {
    const nextState = !showHistory;
    setShowHistory(nextState);
    if (nextState && activeEmployee) {
      void fetchRouteHistory(activeEmployee.deviceId || activeEmployee.id || activeEmployee.userId, selectedDate);
    } else {
      setIsPlaying(false);
    }
  };

  const copyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`).then(() => {
      alert(`Copied coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });
  };

  const handleExportUserRouteCsv = () => {
    if (!activeEmployee || !historyLogs || historyLogs.length === 0) {
      alert('No location history logs available for this date.');
      return;
    }

    const headers = ['User ID', 'Device Hardware ID', 'Recorded Date & Time', 'Location Address', 'Latitude', 'Longitude', 'Accuracy (m)'];
    const rows = historyLogs.map((log) => [
      `"${activeEmployee.userId || activeEmployee.name || 'N/A'}"`,
      `"${activeEmployee.deviceId || activeEmployee.id || 'N/A'}"`,
      `"${new Date(log.recordedAt).toLocaleString()}"`,
      `"${(log.address || 'N/A').toString().replace(/"/g, '""')}"`,
      log.lat,
      log.lng,
      log.accuracy ? `±${Math.round(log.accuracy)}m` : 'N/A',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeEmployee.userId || 'user'}_${selectedDate}_route_history.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const centerOnMe = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  };

  const rawHistoryPositions: [number, number][] = historyLogs
    .slice(0, playbackStep + 1)
    .map((log) => [log.lat, log.lng]);

  // Smooth out polylines to remove micro-jitter using RDP algorithm
  const historyPositions: [number, number][] = simplifyPolyline(rawHistoryPositions);

  const currentStepLog = historyLogs[playbackStep];

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      {/* Mobile Toggle Button */}
      <button
        className={`mobile-toggle-btn map-controls-toggle ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="Toggle Map Controls"
      >
        {isSidebarOpen ? (
          <X className="icon-primary" />
        ) : (
          <Users className="icon-primary" />
        )}
      </button>

      {/* Center on Me Button */}
      {userLocation && (
        <button
          className="center-me-btn"
          onClick={centerOnMe}
          title="Center on my location"
        >
          <Navigation className="icon-primary" />
        </button>
      )}

      {/* Map Controls Sidebar */}
      <aside
        className={`dashboard-sidebar map-controls-sidebar glass-panel ${isSidebarOpen ? 'open' : 'closed'}`}
      >
        <div className="sidebar-header">
          <h2>Map Controls</h2>
          <p className="time-display">{currentTime.toLocaleTimeString()}</p>
        </div>

        <div className="employee-list">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ margin: 0 }}>
              <Users className="inline-icon" /> Track Team
            </h3>
          </div>

          {/* Toggle Route History View */}
          {activeEmployee && (
            <button
              onClick={toggleHistoryMode}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: showHistory ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <History size={16} />
              {showHistory ? 'Disable Route Playback' : 'View Route Playback'}
            </button>
          )}

          {/* Active Employee Coordinates Panel */}
          {activeEmployee && activeEmployee.lat != null && (
            <div
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📍 {activeEmployee.name} — Exact Position
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Latitude</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                    {(activeEmployee.lat as number).toFixed(6)}°
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Longitude</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                    {(activeEmployee.lng as number).toFixed(6)}°
                  </span>
                </div>
                {activeEmployee.address && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>📍 Location Address</span>
                    <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500, lineHeight: '1.3' }}>
                      {activeEmployee.address}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Capture Latency</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                    ⚡ {activeEmployee.intervalMinutes ?? 2} min interval
                  </span>
                </div>
                {activeEmployee.recordedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last seen</span>
                    <span style={{ fontSize: '11px', color: '#34d399' }}>
                      {new Date(activeEmployee.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={() => copyCoordinates(activeEmployee.lat, activeEmployee.lng)}
                  title="Copy to clipboard"
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '11px',
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '6px',
                    color: '#93c5fd',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => setStreetViewModal({ isOpen: true, name: activeEmployee.name || activeEmployee.userId, lat: activeEmployee.lat, lng: activeEmployee.lng })}
                  title="Open 360° Street View"
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '11px',
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    color: '#34d399',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Camera size={13} /> 360° View
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center text-secondary py-4">Loading team...</div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className={`employee-card ${activeEmployee?.id === emp.id ? 'active' : ''}`}
                onClick={() => handleEmployeeClick(emp)}
              >
                <div className="emp-info">
                  <h4>{emp.name}</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{emp.role}</p>
                  {emp.lat != null && (
                    <p style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                      {(emp.lat as number).toFixed(4)}, {(emp.lng as number).toFixed(4)}
                    </p>
                  )}
                  {emp.recordedAt && (
                    <p style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                      {new Date(emp.recordedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div
                  className={`status-indicator ${(emp.status || 'offline').toLowerCase()}`}
                ></div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className={`dashboard-main map-style-${mapStyle}`} style={{ position: 'relative' }}>
        
        {/* Map Style Selector */}
        <div style={{ position: 'absolute', top: '100px', right: '16px', zIndex: 1000, display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <button 
            onClick={() => setMapStyle('osm')} 
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: mapStyle === 'osm' ? '#eff6ff' : 'transparent', color: mapStyle === 'osm' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}
          >
            OSM
          </button>
          <button 
            onClick={() => setMapStyle('street')} 
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: mapStyle === 'street' ? '#eff6ff' : 'transparent', color: mapStyle === 'street' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}
          >
            Street
          </button>
          <button 
            onClick={() => setMapStyle('satellite')} 
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: mapStyle === 'satellite' ? '#eff6ff' : 'transparent', color: mapStyle === 'satellite' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}
          >
            Satellite
          </button>
        </div>

        <MapContainer center={mapCenter} zoom={13} className={`map-container map-style-${mapStyle}`}>
          <ChangeView center={mapCenter} />
          <ResizeMap isSidebarOpen={isSidebarOpen} />
          
          <TileLayer
            url={
              mapStyle === 'osm'
                ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                : mapStyle === 'street'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            }
            attribution={
              mapStyle === 'osm'
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                : mapStyle === 'street'
                ? 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
                : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }
          />

          {userLocation && (
            <Marker position={userLocation}>
              <Popup>
                <div className="popup-content">
                  <strong>You are here</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render Active Employees — skip offline users (lat is null) */}
          {!showHistory &&
            employees
              .filter((emp) => emp.lat != null && emp.lng != null)
              .map((emp) => (
              <React.Fragment key={emp.id}>
                {emp.accuracy != null && emp.accuracy > 0 && (
                  <Circle
                    center={[emp.lat, emp.lng]}
                    radius={emp.accuracy}
                    pathOptions={{
                      color: '#2563eb',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: '4, 4',
                    }}
                  />
                )}
                <Marker position={[emp.lat, emp.lng]}>
                <Popup maxWidth={260}>
                  <div className="popup-content" style={{ minWidth: '220px' }}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>{emp.name}</strong>
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: emp.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                          color: emp.status === 'Active' ? '#16a34a' : '#64748b',
                        }}
                      >
                        {emp.status}
                      </span>
                    </div>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Role</td>
                          <td style={{ fontWeight: 600 }}>{emp.role}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Latitude</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8' }}>{(emp.lat as number).toFixed(6)}°</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Longitude</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8' }}>{(emp.lng as number).toFixed(6)}°</td>
                        </tr>
                        {emp.address && (
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px', verticalAlign: 'top' }}>Address</td>
                            <td style={{ fontWeight: 500, fontSize: '11px', color: '#334155' }}>{emp.address}</td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Latency Mode</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>⚡ {emp.intervalMinutes ?? 2} min interval</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Accuracy</td>
                          <td style={{ fontWeight: 600 }}>±{emp.accuracy != null ? `${Math.round(emp.accuracy)} m` : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Battery</td>
                          <td style={{ fontWeight: 600 }}>{emp.battery}%</td>
                        </tr>
                        {emp.recordedAt && (
                          <tr>
                            <td style={{ color: '#64748b', paddingRight: '8px' }}>Last Update</td>
                            <td style={{ fontWeight: 600 }}>{new Date(emp.recordedAt).toLocaleTimeString()}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => copyCoordinates(emp.lat, emp.lng)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: '11px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => setStreetViewModal({ isOpen: true, name: emp.name || emp.userId, lat: emp.lat, lng: emp.lng })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: '11px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          color: '#047857',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Camera size={13} /> 360° View
                      </button>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '6px',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      🗺 Open in Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
              </React.Fragment>
            ))}

          {/* Render Breadcrumb Route Trail */}
          {showHistory && (
            <>
              {historyPositions.length > 1 && (
                <Polyline
                  positions={historyPositions}
                  color="#3b82f6"
                  weight={5}
                  opacity={0.8}
                  dashArray="8, 8"
                />
              )}

              {historyLogs.slice(0, playbackStep + 1).map((log, index) => (
                <React.Fragment key={log.id || index}>
                  {log.accuracy != null && log.accuracy > 0 && (
                    <Circle
                      center={[log.lat, log.lng]}
                      radius={log.accuracy}
                      pathOptions={{
                        color: index === playbackStep ? '#ef4444' : '#3b82f6',
                        fillColor: index === playbackStep ? '#f87171' : '#60a5fa',
                        fillOpacity: 0.12,
                        weight: 1,
                      }}
                    />
                  )}
                  <CircleMarker
                    center={[log.lat, log.lng]}
                    radius={index === playbackStep ? 10 : 5}
                    pathOptions={{
                      color: index === playbackStep ? '#ef4444' : '#3b82f6',
                      fillColor: index === playbackStep ? '#ef4444' : '#60a5fa',
                      fillOpacity: index === playbackStep ? 1 : 0.7,
                    }}
                  >
                  <Popup maxWidth={240}>
                    <div className="popup-content" style={{ minWidth: '200px' }}>
                      <strong style={{ fontSize: '13px' }}>
                        {index === playbackStep ? '📍 Current Position' : `Stop #${index + 1}`}
                      </strong>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '6px' }}>
                        <tbody>
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Latitude</td>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8' }}>{log.lat.toFixed(6)}°</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Longitude</td>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8' }}>{log.lng.toFixed(6)}°</td>
                          </tr>
                          {log.address && (
                            <tr>
                              <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px', verticalAlign: 'top' }}>Address</td>
                              <td style={{ fontWeight: 500, fontSize: '11px', color: '#334155' }}>{log.address}</td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Latency Mode</td>
                            <td style={{ fontWeight: 600, color: '#2563eb' }}>⚡ {log.intervalMinutes ?? 2} min interval</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Time</td>
                            <td style={{ fontWeight: 600 }}>
                              {new Date(log.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b', paddingBottom: '3px', paddingRight: '8px' }}>Accuracy</td>
                            <td style={{ fontWeight: 600 }}>±{log.accuracy != null ? `${Math.round(log.accuracy)} m` : 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#64748b', paddingRight: '8px' }}>Speed</td>
                            <td style={{ fontWeight: 600 }}>{log.speed != null ? `${log.speed.toFixed(1)} km/h` : 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                      <a
                        href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', marginTop: '6px', textAlign: 'center', fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                      >
                        🗺 Open in Google Maps ↗
                      </a>
                    </div>
                  </Popup>
                </CircleMarker>
                </React.Fragment>
              ))}
            </>
          )}
        </MapContainer>

        {/* Travel Telemetry Metrics Banner Overlay */}
        {showHistory && activeEmployee && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '12px 24px',
              borderRadius: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              width: '90%',
              maxWidth: '800px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <Compass className="text-blue-400" size={20} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Distance</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#60a5fa' }}>
                  {calculateRouteMetrics(historyLogs).totalDistanceKm} km
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <Clock className="text-purple-400" size={20} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Travel Duration</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#c084fc' }}>
                  {calculateRouteMetrics(historyLogs).formattedDuration}
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <Navigation className="text-emerald-400" size={20} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Visited Locations</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>
                  {calculateRouteMetrics(historyLogs).visitedLocationsCount} Stops
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar className="text-amber-400" size={18} />
              <input
                type="date"
                value={selectedDate}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const empId = activeEmployee?.deviceId || activeEmployee?.id || activeEmployee?.userId;
                  if (empId) fetchRouteHistory(empId, newDate);
                }}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '4px 8px',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {historyLogs.length > 0 && (
              <>
                <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <button
                  onClick={handleExportUserRouteCsv}
                  title="Export User Location History CSV"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={14} /> Export Route CSV
                </button>
              </>
            )}
          </div>
        )}

        {/* Route Playback Scrubber Control Bar */}
        {showHistory && activeEmployee && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '12px 24px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              width: '90%',
              maxWidth: '600px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setPlaybackStep(0);
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={18} />
            </button>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginBottom: '4px',
                }}
              >
                <span>
                  {activeEmployee.name} - Point {playbackStep + 1} of{' '}
                  {historyLogs.length}
                </span>
                <span>
                  {currentStepLog
                    ? new Date(currentStepLog.recordedAt).toLocaleTimeString()
                    : '--:--'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, historyLogs.length - 1)}
                value={playbackStep}
                onChange={(e) => setPlaybackStep(parseInt(e.target.value, 10))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
        {/* 360° Street View Modal */}
        {streetViewModal && streetViewModal.isOpen && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div
              className="modal-content glass-panel animate-fade-in"
              style={{
                maxWidth: '850px',
                width: '92%',
                padding: '24px',
                borderRadius: '16px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera className="text-emerald-400" size={20} />
                    <span>360° Street View</span>
                    <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px' }}>
                      {streetViewModal.name}
                    </span>
                  </h2>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
                    Interactive 360° street panorama for location coordinates ({streetViewModal.lat.toFixed(6)}°, {streetViewModal.lng.toFixed(6)}°)
                  </p>
                </div>
                <button
                  onClick={() => setStreetViewModal(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '450px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#000',
                }}
              >
                <iframe
                  title="360 Street View Panorama"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=&layer=c&cbll=${streetViewModal.lat},${streetViewModal.lng}&cbp=11,0,0,0,0&output=svembed`}
                ></iframe>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  💡 Drag mouse inside panorama to look 360° around the location.
                </span>
                <a
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewModal.lat},${streetViewModal.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '8px 16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Open in Google Maps ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveMap;
