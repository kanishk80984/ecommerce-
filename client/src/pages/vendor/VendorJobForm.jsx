import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api';
import RichTextEditor from '../../components/RichTextEditor';

const PointInputList = ({ label, placeholder, values, onChange, autoSplit = false }) => {
  const handlePointChange = (index, value) => {
    if (autoSplit && (value.includes(',') || value.includes('/'))) {
      const parts = value.split(/[,\/]/);
      const updated = [...values];
      updated[index] = parts[0].trim();
      
      const remaining = parts.slice(1).map(p => p.trim());
      updated.splice(index + 1, 0, ...remaining);
      
      onChange(updated);
      
      // Auto focus the next newly created input
      setTimeout(() => {
        const wrapper = document.querySelector(`[data-label="${label.replace(/\s+/g, '-')}"]`);
        if (wrapper) {
          const inputs = wrapper.querySelectorAll('input');
          if (inputs && inputs[index + 1]) {
            inputs[index + 1].focus();
          }
        }
      }, 0);
      return;
    }

    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  const addPoint = () => {
    onChange([...values, '']);
  };

  const removePoint = (index) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : ['']);
  };

  return (
    <div className="space-y-2" data-label={label.replace(/\s+/g, '-')}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        <button
          type="button"
          onClick={addPoint}
          className="text-xs font-bold text-red-650 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-105 px-2.5 py-1.5 rounded-lg border border-red-200/50 cursor-pointer transition-colors"
        >
          + Add Point
        </button>
      </div>
      <div className="space-y-2">
        {values.map((point, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-400 font-bold select-none">•</span>
            <input
              type="text"
              value={point}
              onChange={(e) => handlePointChange(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500"
            />
            {values.length > 1 && (
              <button
                type="button"
                onClick={() => removePoint(index)}
                className="text-gray-400 hover:text-red-500 p-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const VendorJobForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  const [responsibilitiesPoints, setResponsibilitiesPoints] = useState(['']);
  const [requirementsPoints, setRequirementsPoints] = useState(['']);
  const [qualificationsPoints, setQualificationsPoints] = useState(['']);
  const [benefitsPoints, setBenefitsPoints] = useState(['']);
  
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    description: '',
    responsibilities: '',
    requirements: '',
    qualifications: '',
    benefits: '',
    employment_type: 'Full Time',
    work_mode: 'On-site',
    experience_min: '',
    experience_max: '',
    salary_type: 'Monthly',
    salary_min: '',
    salary_max: '',
    salary_period: 'Per Month',
    country: 'India',
    state: 'Tamil Nadu',
    district: '',
    city: '',
    area: '',
    pincode: '',
    number_of_openings: 1,
    availability_to_join: '',
    application_method: 'INTERNAL',
    application_email: '',
    application_phone: '',
    application_url: '',
    application_deadline: '',
    status: 'PUBLISHED'
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchJobDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/public/job-categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchJobDetails = async () => {
    try {
      // The public endpoint getPublicJobBySlug gets by slug, but for edit we might need a generic vendor get or we can fetch the job array and filter.
      // Since we don't have a specific `GET /api/jobs/vendor/:id`, I'll fetch all vendor jobs and filter.
      const res = await api.get('/jobs/vendor/list');
      const job = res.data.find(j => j.id === parseInt(id));
      if (job) {
        // Format dates
        if (job.application_deadline) {
          job.application_deadline = job.application_deadline.split('T')[0];
        }
        setFormData({ ...formData, ...job });

        if (job.responsibilities) {
          const parsed = job.responsibilities.split('\n').map(line => line.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
          setResponsibilitiesPoints(parsed.length > 0 ? parsed : ['']);
        }
        if (job.requirements) {
          const parsed = job.requirements.split('\n').map(line => line.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
          setRequirementsPoints(parsed.length > 0 ? parsed : ['']);
        }
        if (job.qualifications) {
          const parsed = job.qualifications.split(',').map(s => s.trim()).filter(Boolean);
          setQualificationsPoints(parsed.length > 0 ? parsed : ['']);
        }
        if (job.benefits) {
          const delimiter = job.benefits.includes('\n') ? '\n' : ',';
          const parsed = job.benefits.split(delimiter).map(line => line.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
          setBenefitsPoints(parsed.length > 0 ? parsed : ['']);
        }
      } else {
        setError('Job not found');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRichTextChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Custom validation
    const activeResp = responsibilitiesPoints.filter(p => p.trim());
    const activeReq = requirementsPoints.filter(p => p.trim());
    const activeQual = qualificationsPoints.filter(p => p.trim());
    const activeBenefits = benefitsPoints.filter(p => p.trim());

    if (activeResp.length === 0) {
      setError('Please add at least one Key Responsibility.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activeReq.length === 0) {
      setError('Please add at least one Requirement.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activeQual.length === 0) {
      setError('Please add at least one Required Skill.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    const submitData = {
      ...formData,
      responsibilities: activeResp.map(p => `• ${p.trim()}`).join('\n'),
      requirements: activeReq.map(p => `• ${p.trim()}`).join('\n'),
      qualifications: activeQual.map(p => p.trim()).join(', '),
      benefits: activeBenefits.map(p => `• ${p.trim()}`).join('\n')
    };

    try {
      if (isEdit) {
        await api.put(`/jobs/vendor/${id}`, submitData);
      } else {
        await api.post('/jobs/vendor', submitData);
      }
      navigate('/vendor/jobs');
    } catch (err) {
      console.error(err);
      setError('Failed to save job. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/vendor/jobs" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Job Posting' : 'Post a New Job'}</h1>
          <p className="text-gray-500 text-sm mt-1">Fill in the details to find the right candidate.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Basic Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" placeholder="e.g. React Developer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Category *</label>
              <select name="category_id" required value={formData.category_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
              <select name="employment_type" value={formData.employment_type} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode *</label>
              <select name="work_mode" value={formData.work_mode} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
              <input type="number" name="number_of_openings" min="1" value={formData.number_of_openings} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Location & Salary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input type="text" name="city" required value={formData.city} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input type="text" name="state" required value={formData.state} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Salary</label>
              <input type="number" name="salary_min" value={formData.salary_min} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" placeholder="e.g. 20000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Salary</label>
              <input type="number" name="salary_max" value={formData.salary_max} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" placeholder="e.g. 40000" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Detailed Description</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
            <textarea 
              name="description" 
              required
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Enter complete job description..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-red-500 focus:border-red-500 min-h-[120px]" 
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Professional Details</h2>
          
          <PointInputList 
            label="Key Responsibilities *" 
            placeholder="e.g. Lead a team of developers" 
            values={responsibilitiesPoints} 
            onChange={setResponsibilitiesPoints} 
          />
          
          <PointInputList 
            label="Requirements *" 
            placeholder="e.g. Bachelor's Degree in Computer Science" 
            values={requirementsPoints} 
            onChange={setRequirementsPoints} 
          />

          <PointInputList 
            label="Required Skills *" 
            placeholder="e.g. React" 
            values={qualificationsPoints} 
            onChange={setQualificationsPoints} 
            autoSplit={true}
          />

          <PointInputList 
            label="Benefits" 
            placeholder="e.g. Health Insurance" 
            values={benefitsPoints} 
            onChange={setBenefitsPoints} 
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Application Setup</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Method *</label>
              <select name="application_method" value={formData.application_method} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="INTERNAL">Internal (Apply on Platform)</option>
                <option value="EMAIL">Email</option>
                <option value="URL">External URL</option>
              </select>
            </div>
            
            {formData.application_method === 'EMAIL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input type="email" name="application_email" required value={formData.application_email} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
              </div>
            )}
            
            {formData.application_method === 'URL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External URL *</label>
                <input type="url" name="application_url" required value={formData.application_url} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
              <input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability to Join *</label>
              <select name="availability_to_join" required value={formData.availability_to_join} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="">Select availability</option>
                <option value="Immediate">Immediate</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500">
                <option value="PUBLISHED">Published (Active)</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-6">
          <button type="button" onClick={() => navigate('/vendor/jobs')} className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-6 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Save size={18} /> {submitting ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorJobForm;
