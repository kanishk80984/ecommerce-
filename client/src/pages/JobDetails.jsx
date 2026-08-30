import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Briefcase, MapPin, Clock, IndianRupee, Building, ArrowLeft, Send, CheckCircle, Upload, Star } from 'lucide-react';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { getImageUrl } from '../utils/imageUrl';
import { useSsrData } from '../ssr/SsrDataContext';

const JobDetails = () => {
  const { slug } = useParams();
  const ssrContext = useSsrData();
  const ssrJob = ssrContext?.data?.pageType === 'jobDetails' && ssrContext?.data?.job?.slug === slug ? ssrContext.data.job : null;
  const ssrNotFound = ssrContext?.data?.pageType === 'notFound';

  const [job, setJob] = useState(ssrJob);
  const [loading, setLoading] = useState(!ssrJob && !ssrNotFound);
  const [error, setError] = useState(ssrNotFound ? 'Job not found or has been removed.' : '');

  // Application State
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [applying, setApplying] = useState(false);
  const [applicationData, setApplicationData] = useState({ coverLetter: '', resumeUrl: '', fullName: '', email: '', phone: '', experienceYears: '', highestQualification: '', primarySkills: '' });
  const [applicationStatus, setApplicationStatus] = useState(null); // 'success', 'error'
  const [isMounted, setIsMounted] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const descRef = React.useRef(null);
  const [showReadMore, setShowReadMore] = useState(false);
  const [jobDescExpanded, setJobDescExpanded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!job && !ssrNotFound && (!ssrContext?.data?.job || ssrContext.data.job.slug !== slug)) {
      fetchJobDetails();
    }
  }, [slug]);

  useEffect(() => {
    if (job && descRef.current) {
      // Small timeout to allow styling and layout computation
      const timer = setTimeout(() => {
        if (descRef.current) {
          const hasOverflow = descRef.current.scrollHeight > descRef.current.clientHeight;
          setShowReadMore(hasOverflow);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [job, isMounted]);

  const clientUser = isMounted ? user : null;
  const clientAuthenticated = isMounted ? isAuthenticated : false;

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/${slug}`);
      setJob(res.data);
    } catch (err) {
      console.error(err);
      setError('Job not found or has been removed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      alert("Only PDF, DOC, and DOCX files are allowed.");
      return;
    }

    setSelectedFile(file);
    setUploadingResume(true);

    const formDataObj = new FormData();
    formDataObj.append('resume', file);

    try {
      const res = await api.post('/jobs/upload-resume', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setApplicationData(prev => ({ ...prev, resumeUrl: res.data.url }));
      } else {
        alert("Upload failed. Please try again.");
        setSelectedFile(null);
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      alert(err.response?.data?.message || "Error uploading resume file.");
      setSelectedFile(null);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert("Please login to apply");
      return;
    }

    if (!applicationData.resumeUrl) {
      alert("Please upload your resume before submitting.");
      return;
    }

    if (!applicationData.experienceYears || !applicationData.highestQualification || !applicationData.primarySkills) {
      alert("Please fill in all required fields (Experience, Qualification, and Skills).");
      return;
    }

    setApplying(true);
    try {
      await api.post('/jobs/apply', {
        jobId: job.id,
        coverLetter: applicationData.coverLetter,
        resumeUrl: applicationData.resumeUrl,
        fullName: applicationData.fullName || clientUser?.name || '',
        email: applicationData.email || clientUser?.email || '',
        phone: applicationData.phone || clientUser?.phone || '',
        experienceYears: applicationData.experienceYears,
        highestQualification: applicationData.highestQualification,
        primarySkills: applicationData.primarySkills
      });
      setApplicationStatus('success');
    } catch (err) {
      console.error(err);
      setApplicationStatus('error');
      alert(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/jobs" className="text-red-650 font-medium hover:underline flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 pt-4">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-3 flex-wrap">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <span>&gt;</span>
          <Link to="/jobs" className="hover:text-red-600 transition-colors">Jobs</Link>
          <span>&gt;</span>
          <span className="hover:text-red-600 transition-colors">{job.category_name || 'Software Jobs'}</span>
          <span>&gt;</span>
          <span className="text-gray-800 font-semibold">{job.title}</span>
        </div>

        {/* Back Button */}
        <Link to="/jobs" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-5 text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Jobs
        </Link>

        {/* Banner Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm mb-6 flex flex-col gap-4">
          
          {/* Desktop View Layout */}
          <div className="hidden md:flex flex-row gap-6 items-start justify-between w-full">
            <div className="flex flex-row gap-6 items-start flex-1 min-w-0">
              {/* Logo */}
              <div className="w-24 h-24 bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-1.5 overflow-hidden shadow-sm shrink-0">
                {job.business_logo ? (
                  <img src={getImageUrl(job.business_logo)} alt={job.business_name} className="w-full h-full object-contain" />
                ) : (
                  <Briefcase size={32} className="text-gray-300" />
                )}
              </div>

              {/* Title, Company Name, Badges & Salary */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <h1 className="text-xl font-bold text-gray-800 leading-snug">{job.title}</h1>
                
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link to={`/community-profile/${job.vendor_slug || job.vendor_id}`} className="hover:text-red-750 text-[#cc0000] text-base font-bold">
                    {job.business_name}
                  </Link>
                  <span className="inline-flex items-center gap-1 bg-green-50 text-[#16a34a] text-xs font-semibold px-2 py-0.5 rounded-full border border-green-200/60 shrink-0">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z"></path></svg>
                    Verified
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    <Star size={11} className="text-yellow-500 fill-yellow-500" /> 4.5 (28 reviews)
                  </span>
                </div>

                {/* Location, Employment Type & Work Mode Badges */}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <MapPin size={13} className="text-gray-400" />
                    {job.city}, {job.state}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <Briefcase size={13} className="text-gray-400" />
                    {job.employment_type || 'Full Time'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <Clock size={13} className="text-gray-400" />
                    {job.work_mode || 'On-site'}
                  </span>
                </div>

                {/* Salary Details */}
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs md:text-sm">
                  <span className="text-gray-900 font-extrabold text-base">
                    {job.salary_min ? `₹${Number(job.salary_min).toLocaleString('en-IN')}` : ''}
                    {job.salary_max ? ` - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : ''}
                    <span className="text-xs font-medium text-gray-500"> / month</span>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-semibold text-gray-600">{job.number_of_openings || 2} Openings</span>
                  {job.availability_to_join && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="font-semibold text-gray-600">Joining : {job.availability_to_join}</span>
                    </>
                  )}
                </div>

                {/* Bottom Row (Posted on & Views) */}
                <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-gray-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Posted on {new Date(job.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    {job.views || 135} Views
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Apply Button */}
            <div className="w-48 shrink-0 self-center">
              {job.application_method === 'INTERNAL' ? (
                <a href="#apply-section" className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                  Apply Now
                </a>
              ) : job.application_method === 'URL' ? (
                <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                  Apply on Company Site
                </a>
              ) : (
                <a href={`mailto:${job.application_email}?subject=Application for ${job.title}`} className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                  Apply via Email
                </a>
              )}
            </div>
          </div>

          {/* Mobile View Layout */}
          <div className="md:hidden flex flex-col gap-4 w-full">
            <div className="flex flex-row gap-4 items-center w-full">
              {/* Logo */}
              <div className="w-20 h-20 bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-1.5 overflow-hidden shadow-sm shrink-0">
                {job.business_logo ? (
                  <img src={getImageUrl(job.business_logo)} alt={job.business_name} className="w-full h-full object-contain" />
                ) : (
                  <Briefcase size={32} className="text-gray-300" />
                )}
              </div>

              {/* Title & Company Name */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[13px] sm:text-sm font-bold text-gray-800 leading-snug">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <Link to={`/community-profile/${job.vendor_slug || job.vendor_id}`} className="hover:text-red-750 text-[#cc0000] text-xs sm:text-[13px] font-bold">
                    {job.business_name}
                  </Link>
                  <span className="inline-flex items-center gap-1 bg-green-50 text-[#16a34a] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-green-200/60 shrink-0">
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z"></path></svg>
                    Verified
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    <Star size={11} className="text-yellow-500 fill-yellow-500" /> 4.5 (28 reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <div className="flex-1 min-w-0">
                {/* Location, employment, mode pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <MapPin size={13} className="text-gray-400" />
                    {job.city}, {job.state}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <Briefcase size={13} className="text-gray-400" />
                    {job.employment_type || 'Full Time'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                    <Clock size={13} className="text-gray-400" />
                    {job.work_mode || 'On-site'}
                  </span>
                </div>

                {/* Salary & Openings line */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                  <span className="text-gray-900 font-extrabold">
                    {job.salary_min ? `₹${Number(job.salary_min).toLocaleString('en-IN')}` : ''}
                    {job.salary_max ? ` - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : ''}
                    <span className="text-xs font-medium text-gray-500"> / month</span>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-semibold text-gray-600">{job.number_of_openings || 2} Openings</span>
                </div>

                {/* Bottom row (Posted date & Views) */}
                <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-gray-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Posted on {new Date(job.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    {job.views || 135} Views
                  </span>
                </div>
              </div>

              {/* Apply Stack on the right */}
              <div className="w-full shrink-0">
                {job.availability_to_join && (
                  <div className="text-xs font-bold text-gray-500 mb-2 text-center bg-gray-50 border border-gray-100 rounded-lg py-1 px-2.5 shadow-sm">
                    Availability: <span className="text-red-600">{job.availability_to_join}</span>
                  </div>
                )}
                {job.application_method === 'INTERNAL' ? (
                  <a href="#apply-section" className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                    Apply Now
                  </a>
                ) : job.application_method === 'URL' ? (
                  <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                    Apply on Company Site
                  </a>
                ) : (
                  <a href={`mailto:${job.application_email}?subject=Application for ${job.title}`} className="w-full text-center py-2.5 bg-[#cc0000] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md block">
                    Apply via Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2 Column Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Main Details Column (2 cols) */}
          <div className="md:col-span-2 space-y-6">

            {/* Job Description Card */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
              <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Job Description
              </h2>
              <div
                ref={descRef}
                className={`text-sm leading-relaxed text-gray-600 transition-all duration-300 ${!jobDescExpanded ? 'line-clamp-4 overflow-hidden' : ''
                  }`}
                style={!jobDescExpanded ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical'
                } : {}}
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
              {showReadMore && (
                <button
                  type="button"
                  onClick={() => setJobDescExpanded(!jobDescExpanded)}
                  className="mt-3 text-xs font-bold text-red-600 hover:text-red-700 focus:outline-none flex items-center gap-1 cursor-pointer"
                >
                  {jobDescExpanded ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Responsibilities Card */}
            {job.responsibilities && (
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"></path></svg>
                  Key Responsibilities
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-655">
                  {job.responsibilities.split('\n').map((line, index) => {
                    const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
                    if (!cleaned) return null;
                    return <li key={index} className="leading-relaxed">{cleaned}</li>;
                  })}
                </ul>
              </div>
            )}

            {/* Requirements Card */}
            {job.requirements && (
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  Requirements
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-655">
                  {job.requirements.split('\n').map((line, index) => {
                    const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
                    if (!cleaned) return null;
                    return <li key={index} className="leading-relaxed">{cleaned}</li>;
                  })}
                </ul>
              </div>
            )}

            {/* Required Skills Card */}
            {(job.qualifications || (job.requirements && !job.requirements.includes('\n'))) && (
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2.5 mt-2">
                  {((job.qualifications || job.requirements).split(',')).map((skill, index) => {
                    const trimmed = skill.trim();
                    if (!trimmed || trimmed.startsWith('•')) return null;
                    return (
                      <span key={index} className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-150 px-3.5 py-1.5 rounded-lg shadow-sm">
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Benefits Card */}
            {job.benefits && (
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4m-4 0H8m4 0v4m0 0h3m-3 0H9m3 0v4m0 0h2m-2 0h-2"></path></svg>
                  Benefits
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-655">
                  {job.benefits.split('\n').map((line, index) => {
                    const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
                    if (!cleaned) return null;
                    return <li key={index} className="leading-relaxed">{cleaned}</li>;
                  })}
                </ul>
              </div>
            )}

            {/* Apply Form Card */}
            {job.application_method === 'INTERNAL' && (
              <div id="apply-section" className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 scroll-mt-24">
                <h2 className="text-base font-bold text-gray-900 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  Apply for this role
                </h2>

                {applicationStatus === 'success' ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-8 text-center animate-fade-in">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
                    <p className="text-gray-655 text-sm">The employer has received your application and will contact you directly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-6">
                    {!clientAuthenticated && (
                      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                        You must <Link to="/login" className="font-bold underline">login</Link> to apply for this position.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Personal info */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Information</h4>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                          <input
                            type="text"
                            required
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="Enter your full name"
                            value={applicationData.fullName || clientUser?.name || ''}
                            onChange={(e) => setApplicationData({ ...applicationData, fullName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
                          <input
                            type="email"
                            required
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="Enter your email address"
                            value={applicationData.email || clientUser?.email || ''}
                            onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                          <input
                            type="tel"
                            required
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="Enter your phone number"
                            value={applicationData.phone || clientUser?.phone || ''}
                            onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Years of Experience *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="e.g. 3"
                            value={applicationData.experienceYears}
                            onChange={(e) => setApplicationData({ ...applicationData, experienceYears: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Primary Skills *</label>
                          <input
                            type="text"
                            required
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="e.g. React, Node.js, JavaScript"
                            value={applicationData.primarySkills}
                            onChange={(e) => setApplicationData({ ...applicationData, primarySkills: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Right Column: Resume & Cover letter */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Resume</h4>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Upload Resume *</label>
                          <input
                            type="file"
                            id="resume-file-input"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={!clientAuthenticated || applying || uploadingResume}
                          />
                          <div
                            onClick={() => !uploadingResume && !applying && clientAuthenticated && document.getElementById('resume-file-input').click()}
                            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-red-500 transition-colors cursor-pointer bg-gray-50/50"
                          >
                            <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                            <p className="text-xs font-bold text-gray-700">
                              {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                          </div>

                          {/* File status block */}
                          {applicationData.resumeUrl && (
                            <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs animate-fade-in">
                              <div className="flex items-center gap-2 min-w-0">
                                <svg className="w-6 h-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-700 truncate">
                                    {selectedFile ? selectedFile.name : applicationData.resumeUrl.split('/').pop()}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'Uploaded'}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={applying || uploadingResume}
                                onClick={() => {
                                  setSelectedFile(null);
                                  setApplicationData(prev => ({ ...prev, resumeUrl: '' }));
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cover Letter (Optional)</label>
                          <textarea
                            disabled={!clientAuthenticated || applying}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm resize-none"
                            placeholder="Tell the employer why you're a good fit for this role"
                            value={applicationData.coverLetter}
                            onChange={(e) => setApplicationData({ ...applicationData, coverLetter: e.target.value })}
                          ></textarea>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Highest Qualification *</label>
                          <input
                            type="text"
                            required
                            disabled={!clientAuthenticated || applying}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                            placeholder="e.g. B.E. Computer Science / MCA"
                            value={applicationData.highestQualification}
                            onChange={(e) => setApplicationData({ ...applicationData, highestQualification: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!clientAuthenticated || applying}
                      className="w-full py-3 bg-[#cc0000] hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                      {applying ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Sidebar Column (1 col) */}
          <div className="space-y-6 md:sticky md:top-24 self-start">

            {/* Job Overview sidebar card */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"></path></svg>
                Job Overview
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Employment Type</div>
                    <div className="text-xs font-bold text-gray-805">{job.employment_type || 'Full Time'}</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <Building size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Work Mode</div>
                    <div className="text-xs font-bold text-gray-805">{job.work_mode || 'On-site'}</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <IndianRupee size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Salary</div>
                    <div className="text-xs font-bold text-gray-805">
                      {job.salary_min ? `₹${Number(job.salary_min).toLocaleString('en-IN')}` : ''}
                      {job.salary_max ? ` - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : ''}
                      {(!job.salary_min && !job.salary_max) && 'Not Disclosed'}
                      <span className="text-[10px] font-normal text-gray-500"> / month</span>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Experience</div>
                    <div className="text-xs font-bold text-gray-805">
                      {job.experience_min !== null ? `${job.experience_min}` : '0'}
                      {job.experience_max !== null ? ` - ${job.experience_max}` : ' - 0'} Years (Fresher)
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Openings</div>
                    <div className="text-xs font-bold text-gray-850">{job.number_of_openings || 2}</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Location</div>
                    <div className="text-xs font-bold text-gray-805">{job.city}, {job.state}</div>
                  </div>
                </li>
                {job.availability_to_join && (
                  <li className="flex items-start gap-3">
                    <div className="bg-gray-50 p-2 rounded-xl text-gray-500 border border-gray-100 shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Availability to Join</div>
                      <div className="text-xs font-bold text-gray-805">{job.availability_to_join}</div>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* About the Company sidebar card */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                About the Company
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900">{job.business_name}</h4>
                    <span className="inline-flex items-center gap-0.5 bg-green-50 text-[#16a34a] text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-green-200/60">
                      Verified
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {(() => {
                      const desc = job.store_description || `${job.business_name} is a professional website design and software development company committed to helping businesses build a strong and successful online presence.`;
                      if (desc.length <= 180) {
                        return <p>{desc}</p>;
                      }
                      return (
                        <div>
                          <p className="inline">
                            {descExpanded ? desc : `${desc.slice(0, 160)}...`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setDescExpanded(!descExpanded)}
                            className="text-[#cc0000] font-bold ml-1 hover:underline cursor-pointer focus:outline-none"
                          >
                            {descExpanded ? 'Read Less' : 'Read More'}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <Link to={`/community-profile/${job.vendor_slug || job.vendor_id}`} className="text-red-655 text-xs font-bold hover:underline mt-2 inline-flex items-center gap-1">
                    View Company Profile <span className="text-[10px]">&rarr;</span>
                  </Link>
                </div>

                <hr className="border-gray-100" />

                <ul className="space-y-3.5 text-xs text-gray-700">
                  <li className="flex items-start gap-3">
                    <div className="bg-gray-50 p-1.5 rounded-lg text-gray-400 border border-gray-100 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Industry</div>
                      <div className="font-semibold text-gray-800">IT Services & Consulting</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-gray-50 p-1.5 rounded-lg text-gray-400 border border-gray-100 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Company Size</div>
                      <div className="font-semibold text-gray-800">10 - 50 Employees</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-gray-50 p-1.5 rounded-lg text-gray-400 border border-gray-100 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Founded</div>
                      <div className="font-semibold text-gray-800">{job.year_established || '2015'}</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetails;
