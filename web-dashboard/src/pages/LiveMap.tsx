import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Users,
  X,
  Navigation,
  UserPlus,
  History,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  Compass,
} from 'lucide-react';
import L from 'leaflet';
import AddEmployeeModal from '../components/AddEmployeeModal';
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

// Component to dynamically change map center
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  map.setView(center, zoom);
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Map State
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

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { default: apiClient } = await import('../api/client');
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
            fetchRouteHistory(selected.id);
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
            next[index] = { ...next[index], ...updatedUser };
            return next;
          }
          return [updatedUser, ...prev];
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
  }, [activeEmployee]);

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
  const fetchRouteHistory = async (userId: string) => {
    try {
      const { default: apiClient } = await import('../api/client');
      const response = await apiClient.get(`/tracking/history/${userId}`);
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
      void fetchRouteHistory(emp.id);
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const toggleHistoryMode = () => {
    const nextState = !showHistory;
    setShowHistory(nextState);
    if (nextState && activeEmployee) {
      void fetchRouteHistory(activeEmployee.id);
    } else {
      setIsPlaying(false);
    }
  };

  const centerOnMe = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  };

  const handleAddEmployee = (empData: {
    name: string;
    lat: number;
    lng: number;
  }) => {
    const newEmp = {
      id: Date.now().toString(),
      name: empData.name,
      role: 'New Employee',
      lat: empData.lat,
      lng: empData.lng,
      status: 'Active',
      battery: 100,
    };
    setEmployees([...employees, newEmp]);
    setActiveEmployee(newEmp);
    setMapCenter([empData.lat, empData.lng]);
  };

  const historyPositions: [number, number][] = historyLogs
    .slice(0, playbackStep + 1)
    .map((log) => [log.lat, log.lng]);

  const currentStepLog = historyLogs[playbackStep];

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-toggle-btn map-controls-toggle"
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
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus className="inline-icon" style={{ marginRight: '4px' }} />{' '}
              Add
            </button>
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
                  <p>{emp.role}</p>
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
      <main className="dashboard-main">
        <MapContainer center={mapCenter} zoom={13} className="map-container">
          <ChangeView center={mapCenter} zoom={13} />
          <ResizeMap isSidebarOpen={isSidebarOpen} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

          {/* Render Active Employees */}
          {!showHistory &&
            employees.map((emp) => (
              <Marker key={emp.id} position={[emp.lat, emp.lng]}>
                <Popup>
                  <div className="popup-content">
                    <strong>{emp.name}</strong>
                    <br />
                    Role: {emp.role}
                    <br />
                    Status: {emp.status}
                    <br />
                    Battery: {emp.battery}%
                  </div>
                </Popup>
              </Marker>
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
                <CircleMarker
                  key={log.id || index}
                  center={[log.lat, log.lng]}
                  radius={index === playbackStep ? 9 : 5}
                  pathOptions={{
                    color: index === playbackStep ? '#ef4444' : '#3b82f6',
                    fillColor: index === playbackStep ? '#ef4444' : '#60a5fa',
                    fillOpacity: index === playbackStep ? 1 : 0.7,
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <strong>Breadcrumb #{index + 1}</strong>
                      <br />
                      Time:{' '}
                      {new Date(log.recordedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      <br />
                      Speed: {log.speed ?? 0} km/h
                    </div>
                  </Popup>
                </CircleMarker>
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
              alignItems: 'center',
              gap: '24px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass className="text-blue-400" size={20} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Distance</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#60a5fa' }}>
                  {calculateRouteMetrics(historyLogs).totalDistanceKm} km
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="text-purple-400" size={20} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Travel Duration</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#c084fc' }}>
                  {calculateRouteMetrics(historyLogs).formattedDuration}
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (activeEmployee) fetchRouteHistory(activeEmployee.id);
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
                }}
              />
            </div>
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
      </main>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <AddEmployeeModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddEmployee}
        />
      )}
    </div>
  );
};

export default LiveMap;
