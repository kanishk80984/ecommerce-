import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { Truck, CheckCircle, XCircle, RefreshCw, Settings, Activity } from 'lucide-react';

const DeliveryIntegrationSettings = () => {
  const [settings, setSettings] = useState({
    base_url: '',
    auth_method: 'API_KEY',
    api_credentials: '',
    request_timeout: 5001,
    retry_attempts: 3,
    retry_delay: 2000,
    is_active: false
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/delivery/settings');
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      toast.error('Failed to load delivery settings.');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/delivery/logs');
      if (res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (error) {
      console.error('Failed to load logs', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/delivery/settings', settings);
      toast.success('Delivery integration settings saved.');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await api.post('/delivery/settings/test');
      toast.success(res.data.message || 'Connection successful!');
      fetchSettings(); // Refresh status
      fetchLogs(); // Refresh logs
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection failed.');
      fetchSettings();
      fetchLogs();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-purple-600" />
          Delivery Integration
        </h2>

        {settings.connection_status && (
          <div className="flex items-center gap-2 text-sm font-semibold">
            Status:
            <span className={`px-2 py-1 rounded flex items-center gap-1 ${settings.connection_status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
              settings.connection_status === 'ERROR' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
              {settings.connection_status === 'CONNECTED' && <CheckCircle className="w-4 h-4" />}
              {settings.connection_status === 'ERROR' && <XCircle className="w-4 h-4" />}
              {settings.connection_status}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              API Configuration
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={settings.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="font-semibold text-gray-800">
                  Enable Delivery Integration
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base API URL</label>
                <input
                  type="url"
                  name="base_url"
                  value={settings.base_url}
                  onChange={handleChange}
                  className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://api.deliveryprovider.com/v1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Method</label>
                  <select
                    name="auth_method"
                    value={settings.auth_method}
                    onChange={handleChange}
                    className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="API_KEY">API Key (Header: x-api-key)</option>
                    <option value="BEARER_TOKEN">Bearer Token (Header: Authorization)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Credentials</label>
                  <input
                    type="password"
                    name="api_credentials"
                    value={settings.api_credentials}
                    onChange={handleChange}
                    className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your API key or token"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Timeout (ms)</label>
                  <input
                    type="number"
                    name="request_timeout"
                    value={settings.request_timeout}
                    onChange={handleChange}
                    className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                    min="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retry Attempts</label>
                  <input
                    type="number"
                    name="retry_attempts"
                    value={settings.retry_attempts}
                    onChange={handleChange}
                    className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (ms)</label>
                  <input
                    type="number"
                    name="retry_delay"
                    value={settings.retry_delay}
                    onChange={handleChange}
                    className="w-full border p-2 rounded focus:ring-purple-500 focus:border-purple-500"
                    min="1000"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testing || !settings.base_url}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info & Logs Summary Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-md font-bold text-gray-900 mb-3">Sync Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Last Connected:</span>
                <span className="font-semibold text-gray-800">
                  {settings.last_connection_time ? new Date(settings.last_connection_time).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Sync Status:</span>
                <span className={`font-semibold ${settings.last_sync_status === 'SUCCESS' ? 'text-green-600' :
                  settings.last_sync_status === 'FAILED' ? 'text-red-600' : 'text-gray-800'
                  }`}>
                  {settings.last_sync_status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Logs */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Integration Logs</h3>
          <button onClick={fetchLogs} className="text-sm text-purple-600 font-semibold hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh Logs
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Response Code</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(log => (
                <tr key={log.id} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.method} {log.endpoint}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{log.status_code || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]" title={log.error_message || 'Success'}>
                    {log.error_message || 'Success'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="text-left px-6 py-4">No integration logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryIntegrationSettings;
