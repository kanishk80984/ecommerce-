import React, { useState, useEffect } from 'react';
import { Shield, Search, User, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/superadmin/audit-logs');
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action) => {
    if (action.includes('SUSPEND')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (action.includes('UNSUSPEND')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('APPROVE')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('REJECT')) return 'bg-gray-100 text-gray-800 border-gray-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-primary" size={28} />
            Audit Logs
          </h2>
          <p className="text-gray-500 mt-1">Track administrative actions and system modifications</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by admin name or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Timestamp</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Admin</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Action</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Target User ID</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {log.admin_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{log.admin_name}</p>
                          <p className="text-xs text-gray-500">{log.admin_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action_type)}`}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                      {log.target_user_id || '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.details ? (
                        <div className="bg-gray-100 rounded px-2 py-1 font-mono text-xs overflow-x-auto whitespace-nowrap">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
