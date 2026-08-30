import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate } = rrdPkg;
import { logout } from '../../store/authSlice';
import { AlertCircle, Clock, ShieldAlert, LogOut } from 'lucide-react';

const VendorStatus = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  // Determine state based on user flags
  const isSuspended = user.is_suspended && user.suspension_reason !== 'Application Rejected';
  const isRejected = user.kyc_status === 'REJECTED' || (user.role === 'TECHNICAL_SUPPORT' && user.is_suspended && user.suspension_reason === 'Application Rejected');
  const isPending = (user.kyc_status === 'PENDING' || !user.is_approved) && !isRejected && !isSuspended;

  let title = "Status Check";
  let description = "We are reviewing your account status.";
  let Icon = AlertCircle;
  let statusColor = "text-yellow-600 bg-yellow-50 border-yellow-200";

  const isTechSupport = user.role === 'TECHNICAL_SUPPORT';

  if (isSuspended) {
    title = "Account Suspended";
    description = user.suspension_reason 
      ? `Your account has been suspended for the following reason: "${user.suspension_reason}"`
      : "Your account has been suspended by the administrator. Please contact support for assistance.";
    Icon = ShieldAlert;
    statusColor = "text-red-700 bg-red-50 border-red-200";
  } else if (isRejected) {
    title = "Application Rejected";
    description = isTechSupport 
      ? "Unfortunately, your technical support application has been rejected. Please contact admin for assistance."
      : "Unfortunately, your vendor application has been rejected. Please review your details or contact admin.";
    Icon = AlertCircle;
    statusColor = "text-red-700 bg-red-50 border-red-200";
  } else if (isPending) {
    title = "Pending Approval";
    description = isTechSupport
      ? "Your technical support registration is currently under review by our administration team. Once approved, you will have access to the support panel."
      : "Your vendor registration is currently under review by our administration team. Once approved, you will have full access to the vendor dashboard.";
    Icon = Clock;
    statusColor = "text-blue-700 bg-blue-50 border-blue-200";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6">
      <div className={`max-w-md w-full bg-white rounded-2xl shadow-xl border p-8 flex flex-col items-center text-center`}>
        <div className={`p-4 rounded-full mb-6 ${statusColor.split(' ')[1]}`}>
          <Icon className="w-12 h-12" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">{title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{description}</p>

        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={handleLogout} 
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition-colors shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout from Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorStatus;
