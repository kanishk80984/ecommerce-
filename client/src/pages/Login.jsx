import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { useNavigate, Link } = rrdPkg;
import { useForm } from 'react-hook-form';
import { Mail, Lock, ShoppingBag, ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { setCredentials } from '../store/authSlice';
import { setCart } from '../store/cartSlice';
import api from '../services/api';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector(state => state.cart.items);

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.post('/auth/login', data);
      dispatch(setCredentials(response.data));

      // Sync Cart with server
      try {
        const syncResponse = await api.post('/cart/sync', { localCart: cartItems });
        if (syncResponse.data.success) {
          dispatch(setCart(syncResponse.data.cart));
        }
      } catch (err) {
        console.error('Cart sync failed', err);
      }

      const user = response.data.user;
      const userRole = user?.role;
      if (userRole === 'SUPER_ADMIN') {
        navigate('/superadmin');
      } else if (userRole === 'ADMIN') {
        navigate('/admin');
      } else if (userRole === 'VENDOR') {
        if (user.is_suspended || !user.is_approved || user.kyc_status !== 'APPROVED') {
          navigate('/vendor/status');
        } else {
          navigate('/vendor');
        }
      } else if (userRole === 'TECHNICAL_SUPPORT') {
        if (user.is_suspended || !user.is_approved) {
          navigate('/vendor/status');
        } else {
          navigate('/support-portal');
        }
      } else {
        const returnUrl = localStorage.getItem('checkoutReturnUrl');
        if (returnUrl) {
          localStorage.removeItem('checkoutReturnUrl');
          navigate(returnUrl);
        } else {
          navigate('/'); // Customer dashboard or home
        }
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full login-bg-container bg-center bg-no-repeat md:bg-[size:100%_100%] flex items-center justify-center p-0 md:p-8 relative font-sans">
      <style>{`
        .login-bg-container {
          background-color: #FFF1EE;
        }
        @media (min-width: 768px) {
          .login-bg-container {
            background-image: url('/login-bg.webp');
          }
        }
      `}</style>

      {/* Main Login Card */}
      <div className="relative z-10 flex flex-col md:flex-row w-full md:max-w-[880px] min-h-screen md:min-h-[530px] bg-white rounded-none md:rounded-[20px] shadow-none md:shadow-[0_20px_50px_rgba(0,0,0,0.06)] border-0 md:border md:border-white/40 overflow-hidden transition-all duration-300">

        {/* Left Side: Promotional section (40%) */}
        <section className="relative w-full md:w-[40%] bg-gradient-to-br from-[#E53935] via-[#FF4D4F] to-[#FF6B6B] text-white px-10 py-12 flex flex-col justify-between overflow-hidden">
          {/* Overlay Light Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 pointer-events-none" />

          {/* Soft Glowing Particles / Orbs */}
          <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

          {/* Main Promotional Copy */}
          <div className="relative z-10 my-auto">
            <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-white/80 uppercase mb-4">YOUR APPLICATION</p>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-[1.15] tracking-tight">
              Everything <br />you need, <br />in one place.
            </h1>
            <p className="text-sm md:text-base text-white/90 leading-relaxed font-light max-w-[280px]">
              Sign in to continue to your workspace and stay connected with your team.
            </p>
          </div>

          {/* Bottom Elegant Curved Wave Lines */}
          <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none opacity-20">
            <svg viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0,160 C120,120 240,80 360,106.7 C480,133 600,227 720,240 C840,253 960,187 1080,149.3 C1200,112 1320,103 1380,98.7 L1440,94.7 L1440,320 L1380,320 C1320,320 1200,320 1080,320 C960,320 840,320 720,320 C600,320 480,320 360,320 C240,320 120,320 0,320 Z" fill="white" />
              <path d="M0,220 C180,180 360,140 540,165 C720,190 900,280 1080,260 C1260,240 1380,170 1440,135 L1440,320 L0,320 Z" fill="white" opacity="0.5" />
            </svg>
          </div>
        </section>

        {/* Right Side: Login Form (60%) */}
        <section className="w-full md:w-[60%] px-8 py-10 md:p-12 lg:p-14 flex flex-col justify-center bg-white">
          <div className="w-full max-w-sm mx-auto">
            {/* Top Centered Logo */}
            <div className="flex justify-center mb-6">
              <img
                src="/ibc-logo.png"
                alt="IBC - Grow With Us"
                className="h-16 md:h-18 object-contain transition-transform duration-300 hover:scale-103"
              />
            </div>

            {/* Heading & Subtitle */}
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-[#1F2937] tracking-tight mb-2">
                Sign in to your account
              </h2>
              <p className="text-[#6B7280] text-xs md:text-sm font-medium">
                Access the enterprise e-commerce platform.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Email Field */}
              <div className="relative">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#E53935] transition-colors duration-200">
                    <Mail className="w-5 h-5 stroke-[1.5]" />
                  </span>
                  <input
                    {...register('email', { required: 'Email is required' })}
                    id="email"
                    type="email"
                    className="w-full border border-gray-200 rounded-[8px] pl-12 pr-4 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#E53935]/60 focus:ring-2 focus:ring-[#E53935]/10 transition-all duration-200 bg-white"
                    placeholder="Enter email address"
                  />
                </div>
                {errors.email && <p className="text-[#E53935] text-xs mt-1 pl-1 font-medium">{errors.email.message}</p>}
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#E53935] transition-colors duration-200">
                    <Lock className="w-5 h-5 stroke-[1.5]" />
                  </span>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-[8px] pl-12 pr-12 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#E53935]/60 focus:ring-2 focus:ring-[#E53935]/10 transition-all duration-200 bg-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 stroke-[1.5]" />
                    ) : (
                      <Eye className="w-5 h-5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-[#E53935] text-xs mt-1 pl-1 font-medium">{errors.password.message}</p>}
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-gray-500 font-medium">
                  <input
                    type="checkbox"
                    className="w-4 h-4 border-gray-200 rounded text-[#E53935] focus:ring-[#E53935] accent-[#E53935]"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[#E53935] font-semibold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-[#FFF5F5] border border-[#FDECEC] rounded-[10px] text-[#E53935] text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold py-3 rounded-[8px] shadow-sm hover:scale-[1.005] active:scale-[0.995] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none text-sm cursor-pointer mt-4 flex items-center justify-center gap-2"
              >
                {loading ? 'Logging in…' : 'Continue'}
              </button>
            </form>

            {/* Bottom Register Link */}
            <div className="mt-8 text-center text-xs md:text-sm font-medium">
              <span className="text-gray-500">New to IBC? </span>
              <Link
                to="/register"
                className="text-[#E53935] font-bold hover:underline transition-colors duration-200"
              >
                Create an account
              </Link>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;

