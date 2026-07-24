import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <img src="/logo.png" alt="EMP Logo" style={{ width: '64px', height: '64px', borderRadius: '12px' }} />
            <div>
              <h1>EMP Tracker</h1>
              <p>Enter your credentials to access the live dashboard</p>
            </div>
          </div>
        </div>

        {error && <div className="text-red-400 text-center mb-4 text-sm font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
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
