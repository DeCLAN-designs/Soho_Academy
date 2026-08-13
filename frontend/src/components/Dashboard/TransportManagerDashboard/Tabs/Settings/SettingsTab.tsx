import { useState, useEffect } from 'react';
import axios from 'axios';
import './SettingsTab.css';

interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
  category: string;
  description: string | null;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  is_public: boolean;
  updated_at: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

const SettingsTab = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const [settingsRes, usersRes] = await Promise.all([
        axios.get('/api/transport-manager/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setSettings(settingsRes.data.data.settings || []);
      setUsers(usersRes.data.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditingSettings({ ...editingSettings, [key]: value });
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      const updates = Object.entries(editingSettings).map(([key, value]) => ({
        settingKey: key,
        settingValue: value,
      }));
      
      await axios.patch('/api/transport-manager/bulk', { settings: updates }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setHasChanges(false);
      setEditingSettings({});
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      
      await axios.patch(`/api/users/${userId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  const renderSettingInput = (setting: Setting) => {
    const currentValue = editingSettings[setting.setting_key] !== undefined 
      ? editingSettings[setting.setting_key] 
      : setting.setting_value;

    switch (setting.data_type) {
      case 'boolean':
        return (
          <select
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
          />
        );
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
          />
        );
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="settings">
      <div className="header">
        <h2>Settings</h2>
        <div className="tabs">
          <button 
            className={activeTab === 'system' ? 'active' : ''}
            onClick={() => setActiveTab('system')}
          >
            System Settings
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
        </div>
      </div>

      {activeTab === 'system' && (
        <div className="system-settings">
          {hasChanges && (
            <div className="save-bar">
              <span className="unsaved-changes">You have unsaved changes</span>
              <button className="btn-save" onClick={handleSaveSettings}>
                Save Changes
              </button>
              <button className="btn-discard" onClick={() => {
                setEditingSettings({});
                setHasChanges(false);
              }}>
                Discard
              </button>
            </div>
          )}
          
          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
            <div key={category} className="settings-category">
              <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              <div className="settings-grid">
                {categorySettings.map((setting) => (
                  <div key={setting.id} className="setting-item">
                    <label>
                      {setting.description || setting.setting_key}
                      {setting.is_public && <span className="public-badge">Public</span>}
                    </label>
                    {renderSettingInput(setting)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="user-management">
          <div className="users-header">
            <h3>System Users</h3>
            <span className="user-count">{users.length} users</span>
          </div>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.firstName} {user.lastName}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`status-badge ${user.status.toLowerCase()}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-toggle"
                          onClick={() => handleToggleUserStatus(user.id, user.status)}
                        >
                          {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
