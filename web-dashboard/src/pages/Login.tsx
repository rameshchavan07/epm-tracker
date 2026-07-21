import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Lock, Mail, ArrowRight } from 'lucide-react';

import apiClient from '../api/client';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="full-screen flex-center bg-animated">
      <div className="glass-panel login-card animate-fade-in">
        <div className="login-header">
          <div className="icon-container">
            <MapPin className="icon-primary" />
          </div>
          <h1>EPM Tracker</h1>
          <p>Enter your credentials to access the live dashboard</p>
        </div>

        {error && <div className="text-red-400 text-center mb-4 text-sm font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field" 
                placeholder="admin@company.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field" 
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn">
            Sign In
            <ArrowRight className="btn-icon" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
