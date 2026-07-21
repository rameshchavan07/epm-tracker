import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Map as MapIcon, Users, Settings, LogOut, Menu, X, Hexagon } from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: <BarChart3 className="nav-icon" /> },
    { name: 'Live Map', path: '/dashboard/map', icon: <MapIcon className="nav-icon" /> },
    { name: 'Employees', path: '/dashboard/employees', icon: <Users className="nav-icon" /> },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-toggle-btn hidden-desktop"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="icon-primary" /> : <Menu className="icon-primary" />}
      </button>

      {/* Global Sidebar */}
      <aside className={`global-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <div className="brand-logo flex-center">
            <Hexagon className="text-blue-500 w-8 h-8" />
          </div>
          <h2>EPM Suite</h2>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-link ${location.pathname === '/dashboard/settings' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/settings')}
          >
            <Settings className="nav-icon" /> Settings
          </button>
          <button className="nav-link text-danger" onClick={() => navigate('/')}>
            <LogOut className="nav-icon" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
