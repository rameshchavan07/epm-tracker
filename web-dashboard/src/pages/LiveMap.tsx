import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LogOut, Users, Settings, Menu, X, Navigation, UserPlus } from 'lucide-react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import AddEmployeeModal from '../components/AddEmployeeModal';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically change map center
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

// Component to fix Leaflet gray/white space when parent container resizes
const ResizeMap: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
  const map = useMap();
  useEffect(() => {
    // Wait for the CSS transition to complete before invalidating size
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 350); 
    return () => clearTimeout(timeout);
  }, [isSidebarOpen, map]);
  return null;
};

// Initial Mock data
const initialMockEmployees = [
  { id: '1', name: 'Aarav Sharma', role: 'Field Technician', lat: 19.0760, lng: 72.8777, status: 'Active', battery: 85 }, // Mumbai
  { id: '2', name: 'Priya Patel', role: 'Delivery', lat: 28.7041, lng: 77.1025, status: 'Active', battery: 62 }, // Delhi
  { id: '3', name: 'Rahul Desai', role: 'Sales', lat: 12.9716, lng: 77.5946, status: 'Offline', battery: 12 }, // Bangalore
];

const LiveMap: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeEmployee, setActiveEmployee] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Map State
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to center of India
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { default: apiClient } = await import('../api/client');
        const response = await apiClient.get('/tracking/latest');
        if (response.data && response.data.length > 0) {
          setEmployees(response.data);
          if (!activeEmployee) {
            setActiveEmployee(response.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live locations', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
    const mapTimer = setInterval(fetchLocations, 10000); // Poll every 10s
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(mapTimer);
      clearInterval(clockTimer);
    };
  }, [activeEmployee]);

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc); // Center map on user
        },
        (error) => {
          console.warn("Could not get location, using default India coordinates.", error);
          setMapCenter([20.5937, 78.9629]);
        },
        { enableHighAccuracy: true }
      );
    }
    
    // Automatically close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleLogout = () => {
    navigate('/');
  };

  const handleEmployeeClick = (emp: any) => {
    setActiveEmployee(emp);
    setMapCenter([emp.lat, emp.lng]);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const centerOnMe = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  };

  const handleAddEmployee = (empData: { name: string; lat: number; lng: number }) => {
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

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      {/* Mobile Toggle Button for Map Controls */}
      <button 
        className="mobile-toggle-btn map-controls-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="Toggle Map Controls"
      >
        {isSidebarOpen ? <X className="icon-primary" /> : <Users className="icon-primary" />}
      </button>

      {/* Center on Me Button */}
      {userLocation && (
        <button className="center-me-btn" onClick={centerOnMe} title="Center on my location">
          <Navigation className="icon-primary" />
        </button>
      )}

      {/* Map Controls Sidebar */}
      <aside className={`dashboard-sidebar map-controls-sidebar glass-panel ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Map Controls</h2>
          <p className="time-display">{currentTime.toLocaleTimeString()}</p>
        </div>

        <div className="employee-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}><Users className="inline-icon" /> Track Team</h3>
            <button 
              className="btn-primary" 
              style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus className="inline-icon" style={{ marginRight: '4px' }} /> Add
            </button>
          </div>
          
          {loading ? (
            <div className="text-center text-secondary py-4">Loading team...</div>
          ) : employees.map((emp) => (
            <div 
              key={emp.id} 
              className={`employee-card ${activeEmployee?.id === emp.id ? 'active' : ''}`}
              onClick={() => handleEmployeeClick(emp)}
            >
              <div className="emp-info">
                <h4>{emp.name}</h4>
                <p>{emp.role}</p>
              </div>
              <div className={`status-indicator ${(emp.status || 'offline').toLowerCase()}`}></div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="dashboard-main">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          className="map-container"
        >
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

          {employees.map((emp) => (
            <Marker key={emp.id} position={[emp.lat, emp.lng]}>
              <Popup>
                <div className="popup-content">
                  <strong>{emp.name}</strong><br/>
                  Role: {emp.role}<br/>
                  Status: {emp.status}<br/>
                  Battery: {emp.battery}%
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
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
