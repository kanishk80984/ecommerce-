import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Briefcase, Users, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const VendorJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/jobs/vendor/list');
      setJobs(response.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.patch(`/jobs/vendor/${id}/status`, { status: newStatus });
      fetchJobs();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
    try {
      await api.delete(`/jobs/vendor/${id}`);
      fetchJobs();
    } catch (err) {
      console.error(err);
      alert('Failed to delete job');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="text-red-600" /> Job Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your job postings and applications</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/vendor/jobs/applications"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm border border-gray-200"
          >
            <Users size={16} /> View Applications
          </Link>
          <Link
            to="/vendor/jobs/create"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={16} /> Post a Job
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Jobs Posted Yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto mb-6">You haven't posted any jobs. Start hiring top talent by creating your first job listing.</p>
          <Link
            to="/vendor/jobs/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
          >
            <Plus size={18} /> Post Your First Job
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Job Title</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type / Mode</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Posted On</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{job.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{job.city}, {job.state}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{job.employment_type}</div>
                      <div className="text-xs text-gray-500 mt-1">{job.work_mode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${job.status === 'ACTIVE' || job.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 
                          job.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200' : 
                          job.status === 'PAUSED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                          'bg-red-50 text-red-700 border-red-200'}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/jobs/${job.slug}`} 
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Public Page"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link 
                          to={`/vendor/jobs/edit/${job.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Job"
                        >
                          <Edit size={18} />
                        </Link>
                        <button 
                          onClick={() => handleStatusChange(job.id, job.status)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Toggle Status"
                        >
                          <Clock size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Job"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorJobs;
