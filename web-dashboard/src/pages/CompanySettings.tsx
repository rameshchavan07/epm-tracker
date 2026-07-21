import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
} from 'lucide-react';

interface CompanyProfile {
  id: string;
  name: string;
  subscriptionPlan: string;
  status: boolean;
  createdAt: string;
}

const CompanySettings: React.FC = () => {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [name, setName] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('PRO');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const { default: apiClient } = await import('../api/client');
        const response = await apiClient.get('/company/profile');
        if (response.data) {
          setCompany(response.data);
          setName(response.data.name || '');
          setSubscriptionPlan(response.data.subscriptionPlan || 'PRO');
        }
      } catch (err) {
        console.error('Failed to load company profile', err);
        setMessage({ type: 'error', text: 'Failed to load company profile from server.' });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { default: apiClient } = await import('../api/client');
      const response = await apiClient.patch('/company/profile', {
        name,
        subscriptionPlan,
      });

      if (response.data) {
        setCompany(response.data);
        setMessage({ type: 'success', text: 'Company profile updated successfully!' });
      }
    } catch (err) {
      console.error('Failed to update company profile', err);
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="text-secondary">Loading company settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: '#fff' }}>
          Company Settings
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Manage your organization profile, subscription plan, and system preferences.
        </p>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* General Company Details Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Building2 className="text-blue-500" size={24} />
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#fff' }}>
                Organization Profile
              </h2>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                Company ID (System Reference)
              </label>
              <input
                type="text"
                value={company?.id || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#64748b',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                Account Status
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: company?.status ? '#22c55e' : '#ef4444',
                  }}
                ></span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                  {company?.status ? 'Active Enterprise Subscription' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription & Licensing Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <CreditCard className="text-blue-500" size={24} />
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#fff' }}>
                Subscription Plan
              </h2>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                Current Tier
              </label>
              <select
                value={subscriptionPlan}
                onChange={(e) => setSubscriptionPlan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="FREE">Starter Plan (Free - up to 5 users)</option>
                <option value="PRO">Professional Plan (Pro - up to 50 users)</option>
                <option value="ENTERPRISE">Enterprise Plan (Unlimited users & API access)</option>
              </select>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <Sparkles className="text-blue-400" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.5' }}>
                <strong>Pro Plan Highlights:</strong> Real-time GPS tracking, 30-day route history retention, WorkManager sync, and automated analytics reports.
              </div>
            </div>
          </div>

          {/* System & API Status Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Server className="text-blue-500" size={24} />
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#fff' }}>
                System Configuration
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Backend Status</div>
                <div style={{ color: '#4ade80', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Online (v1.0.0)
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Database Engine</div>
                <div style={{ color: '#60a5fa', fontWeight: '600' }}>Neon PostgreSQL</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Member Since</div>
                <div style={{ color: '#fff', fontWeight: '500' }}>
                  {company?.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Button */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={18} />
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;
