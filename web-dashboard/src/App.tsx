import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import LiveMap from './pages/LiveMap';
import Employees from './pages/Employees';
import CompanySettings from './pages/CompanySettings';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="map" element={<LiveMap />} />
          <Route path="employees" element={<Employees />} />
          <Route path="settings" element={<CompanySettings />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
