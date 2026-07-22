import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Edit, Trash2, Download, Navigation, X } from 'lucide-react';
import apiClient from '../api/client';

import AddEmployeeModal from '../components/AddEmployeeModal';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  status?: string;
  shortId?: string;
  deviceId?: string;
  createdAt?: string;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await apiClient.get('/users');
        setEmployees(response.data);
      } catch (err) {
        console.error('Failed to fetch employees', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleExportCSV = () => {
    const headers = ['Name', 'Role', 'Email', 'Phone', 'Status'];
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => 
        `"${emp.name}","${emp.role}","${emp.email}","${emp.phone || ''}","${emp.status || 'Offline'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employees_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddEmployee = (employeeData: { name: string; lat: number; lng: number }) => {
    // In a real app, you would POST this to your API
    console.log("Adding employee:", employeeData);
    alert(`Successfully added ${employeeData.name}! (API integration pending)`);
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Employee Management</h1>
          <p className="text-secondary">View and manage your tracking roster.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportCSV}>
            <Download className="btn-icon inline-block mr-2" /> Export
          </button>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
            <UserPlus className="btn-icon inline-block mr-2" /> Add Employee
          </button>
        </div>
      </header>

      {showAddModal && (
        <AddEmployeeModal 
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
        />
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="glass-panel max-w-md w-full p-6 relative">
            <button 
              onClick={() => setSelectedEmployee(null)}
              className="absolute top-4 right-4 text-secondary hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedEmployee.name} Details</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-secondary mb-1">Mobile Login ID</p>
                <p className="font-mono text-2xl text-blue-400">{selectedEmployee.shortId || 'Not registered'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary">Email</p>
                  <p className="text-white truncate" title={selectedEmployee.email}>{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Role</p>
                  <p className="text-white">{selectedEmployee.role}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Status</p>
                  <p className="text-white">{selectedEmployee.status || 'Offline'}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Device Info</p>
                  <p className="text-white truncate" title={selectedEmployee.deviceId || 'Unknown'}>{selectedEmployee.deviceId || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-card glass-panel mt-6">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search employees..." className="search-input" />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>App ID</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">Loading employees...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">No employees found.</td>
                </tr>
              ) : employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="font-medium text-white">{emp.name}</div>
                  </td>
                  <td>{emp.role}</td>
                  <td>
                    {emp.shortId ? (
                      <button 
                        className="text-blue-400 hover:underline font-mono"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        {emp.shortId}
                      </button>
                    ) : (
                      <span className="text-secondary text-sm">None</span>
                    )}
                  </td>
                  <td className="text-secondary truncate max-w-[150px]" title={emp.email}>{emp.email}</td>
                  <td>
                    <span className={`status-badge ${emp.status === 'Active' ? 'active' : 'offline'}`}>
                      {emp.status || 'Offline'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="icon-btn text-blue-400"
                        title="View Travel Route"
                        onClick={() => navigate(`/dashboard/map?userId=${emp.id}`)}
                      >
                        <Navigation size={16} />
                      </button>
                      <button className="icon-btn text-blue-400" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button className="icon-btn text-red-400" title="Delete">
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
