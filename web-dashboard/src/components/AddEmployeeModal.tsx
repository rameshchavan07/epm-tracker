import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { X, MapPin } from 'lucide-react';

interface AddEmployeeModalProps {
  onClose: () => void;
  onAdd: (employee: { name: string; lat: number; lng: number }) => void;
}

// Component to handle map clicks and drop a marker
const LocationPicker: React.FC<{ position: [number, number] | null; setPosition: (pos: [number, number]) => void }> = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedLocation) {
      alert("Please enter a name and select a location on the map.");
      return;
    }
    onAdd({ name, lat: selectedLocation[0], lng: selectedLocation[1] });
    onClose();
  };

  return (
    <div className="modal-overlay flex-center">
      <div className="modal-content glass-panel animate-fade-in">
        <button className="modal-close" onClick={onClose}><X /></button>
        <div className="modal-header">
          <h2>Add New Employee</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Employee Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field" 
              placeholder="e.g. Vikram Singh"
              required
            />
          </div>

          <div className="form-group">
            <label>Initial Location</label>
            {!showMap ? (
              <button 
                type="button" 
                className="btn-secondary map-select-btn" 
                onClick={() => setShowMap(true)}
              >
                <MapPin className="btn-icon" /> Select Location on Map
              </button>
            ) : (
              <div className="mini-map-container">
                <MapContainer 
                  center={[20.5937, 78.9629]} 
                  zoom={4} 
                  className="mini-map"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker position={selectedLocation} setPosition={setSelectedLocation} />
                </MapContainer>
                {selectedLocation && (
                  <p className="success-text">Location selected!</p>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary submit-btn">Add Employee</button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
