import React from 'react';
import { useDispatch } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate } = rrdPkg;
import { setCredentials } from '../store/authSlice';

export const ImpersonationBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminSession = localStorage.getItem('adminSession');

  if (!adminSession) return null;

  let sessionData = null;
  try {
    sessionData = JSON.parse(adminSession);
  } catch (e) {
    return null;
  }

  const handleBackToAdmin = () => {
    // Restore admin credentials
    localStorage.setItem('token', sessionData.token);
    dispatch(setCredentials({
      user: sessionData.user,
      token: sessionData.token
    }));
    // Clean up impersonation data
    localStorage.removeItem('adminSession');
    // Navigate back to admin panel
    const prefix = sessionData.user.role === 'SUPER_ADMIN' ? '/superadmin' : '/admin';
    navigate(prefix + '/users');
  };

  const buttonLabel = sessionData.user.role === 'SUPER_ADMIN' ? '🔙 Back to Super Admin' : '🔙 Back to Admin';

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#0c2340] text-white py-2 px-4 z-[9999] flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 shadow-md border-b border-orange-500 animate-[slideDown_0.3s_ease-out]">
      <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
        <span>Impersonated Session (Logged in as admin: <strong className="text-orange-400">{sessionData.user.name}</strong> [{sessionData.user.role}])</span>
      </div>
      <button
        onClick={handleBackToAdmin}
        className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs md:text-sm px-4 py-1 rounded-lg shadow transition-all transform active:scale-95 shrink-0"
      >
        {buttonLabel}
      </button>
    </div>
  );
};
