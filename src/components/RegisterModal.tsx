import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, Eye, EyeOff, Wallet, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { calculateDailyTarget, getTierInfo, getCurrentDateString, registerNewUser, authenticateUser, ADMIN_EMAIL } from '../utils/storage';
import { registerUserOnCloud, loginUserOnCloud } from '../utils/api';
import { TaizerLogo } from './TaizerLogo';

interface RegisterModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProfile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  canDismiss?: boolean;
  initialMode?: 'login' | 'signup';
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  canDismiss = false,
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Sign Up State - Always start clean for new account creation
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [walletStr, setWalletStr] = useState('20');

  // Login State - Always start clean
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
      setUsername('');
      setEmail('');
      setPassword('');
      setWalletStr('20');
      setLoginPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const walletNum = parseFloat(walletStr) || 0;
  const tierInfo = getTierInfo(walletNum);

  // Sign Up Submit
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (walletNum < 10) {
      setError('Wallet balance must be at least $10 to start your trading plan.');
      return;
    }

    const res = registerNewUser({
      name: username.trim(),
      email: email.trim(),
      password,
      walletBalance: walletNum,
    });

    if (!res.success) {
      setError(res.message);
      return;
    }

    // Also register on MongoDB Atlas Cloud Database
    registerUserOnCloud({
      name: username.trim(),
      email: email.trim(),
      password,
      walletBalance: walletNum,
    }).catch(() => {});

    setSuccessMsg(
      'Registration submitted! Your account is pending Admin approval. You will be able to log in once Admin (supundilshan38@gmail.com) approves your request.'
    );

    // After brief delay, prep login
    setTimeout(() => {
      setMode('login');
      setLoginIdentifier(email.trim());
    }, 4000);
  };

  // Login Submit (checks MongoDB Atlas first for 100% cloud balance accuracy)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    // 1. Try MongoDB Atlas cloud login first
    try {
      const cloudRes = await loginUserOnCloud(loginIdentifier.trim(), loginPassword);
      if (cloudRes.success && cloudRes.user) {
        onSaveProfile(cloudRes.user);
        setSuccessMsg(
          cloudRes.user.role === 'admin'
            ? 'Welcome Admin! Logged in as Supun Dilshan.'
            : 'Logged in successfully! Welcome back.'
        );
        setTimeout(() => {
          if (onClose) onClose();
        }, 600);
        return;
      } else if (cloudRes.message && !cloudRes.message.includes('Network error')) {
        setError(cloudRes.message);
        return;
      }
    } catch {
      // Offline fallback
    }

    // 2. Local fallback if offline
    const res = authenticateUser(loginIdentifier.trim(), loginPassword);

    if (!res.success) {
      setError(res.message);
      return;
    }

    if (res.user) {
      onSaveProfile(res.user);
      setSuccessMsg(
        res.user.role === 'admin'
          ? 'Welcome Admin! Logged in as Supun Dilshan.'
          : 'Logged in successfully! Welcome back.'
      );
      setTimeout(() => {
        if (onClose) onClose();
      }, 600);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain"
    >
      <div
        id="auth-card-container"
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-y-auto border border-stone-800/15 my-auto max-h-[92vh]"
      >
        {/* Close Button if dismissible */}
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 p-2 rounded-full bg-stone-100/90 hover:bg-stone-200 text-stone-700 transition-colors shadow-xs cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ======================================================== */}
        {/* DESKTOP / TABLET: CONTINUOUS SLIDING BLACK OVERLAY       */}
        {/* The black slanted panel physically glides across L & R    */}
        {/* ======================================================== */}
        <div className="hidden sm:block min-h-[520px] relative overflow-hidden bg-white">
          {/* FORM 1: LOGIN (Anchored on the LEFT 50%) */}
          <motion.div
            animate={{
              opacity: mode === 'login' ? 1 : 0,
              x: mode === 'login' ? 0 : -25,
              pointerEvents: mode === 'login' ? 'auto' : 'none',
            }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: mode === 'login' ? 0.15 : 0 }}
            className="absolute left-0 top-0 bottom-0 w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white z-10"
          >
            <div className="max-w-xs mx-auto w-full space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black text-stone-950 tracking-tight">Login</h2>
                <div className="w-9 h-1 bg-stone-950 rounded-full mx-auto mt-1" />
              </div>

              {error && mode === 'login' && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && mode === 'login' && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">Username</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1.5">
                    <input
                      id="login-username-input"
                      type="text"
                      placeholder="Username or Email"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <User className="w-4 h-4 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Password with Eye View Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">Password</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1.5">
                    <input
                      id="login-password-input"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-transparent pr-14 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="text-stone-500 hover:text-stone-950 transition-colors cursor-pointer p-0.5"
                        title={showLoginPassword ? 'Hide password' : 'View password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4 text-stone-800" /> : <Eye className="w-4 h-4 text-stone-600" />}
                      </button>
                      <Lock className="w-4 h-4 text-stone-700 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="login-submit-btn"
                    type="submit"
                    className="w-full py-2.5 px-5 bg-stone-950 hover:bg-stone-800 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Login
                  </button>
                </div>

                <p className="text-xs text-center text-stone-600 pt-2">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="font-bold text-stone-950 underline hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              </form>
            </div>
          </motion.div>

          {/* FORM 2: SIGN UP (Anchored on the RIGHT 50%) */}
          <motion.div
            animate={{
              opacity: mode === 'signup' ? 1 : 0,
              x: mode === 'signup' ? 0 : 25,
              pointerEvents: mode === 'signup' ? 'auto' : 'none',
            }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: mode === 'signup' ? 0.15 : 0 }}
            className="absolute right-0 top-0 bottom-0 w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white z-10"
          >
            <div className="max-w-xs mx-auto w-full space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black text-stone-950 tracking-tight">Sign Up</h2>
                <div className="w-9 h-1 bg-stone-950 rounded-full mx-auto mt-1" />
              </div>

              {error && mode === 'signup' && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && mode === 'signup' && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-3">
                {/* Username */}
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-stone-700 block">Username</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      id="signup-username-input"
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <User className="w-4 h-4 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-stone-700 block">Email</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      id="signup-email-input"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <Mail className="w-4 h-4 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Password with View toggle */}
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-stone-700 block">Password</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      id="signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent pr-14 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-stone-500 hover:text-stone-950 transition-colors cursor-pointer p-0.5"
                        title={showPassword ? 'Hide password' : 'View password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-stone-800" /> : <Eye className="w-4 h-4 text-stone-600" />}
                      </button>
                      <Lock className="w-4 h-4 text-stone-700 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Wallet Balance */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-stone-700">Wallet Balance (USD)</label>
                    <span className="font-mono text-emerald-700 font-bold text-[11px]">
                      ${tierInfo.dailyTarget}/day
                    </span>
                  </div>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      id="signup-wallet-input"
                      type="number"
                      min="10"
                      step="any"
                      placeholder="Starting Wallet ($10 min)"
                      value={walletStr}
                      onChange={(e) => setWalletStr(e.target.value)}
                      className="w-full bg-transparent pr-7 text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    />
                    <Wallet className="w-4 h-4 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="signup-submit-btn"
                    type="submit"
                    className="w-full py-2.5 px-5 bg-stone-950 hover:bg-stone-800 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>

                <p className="text-xs text-center text-stone-600 pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-bold text-stone-950 underline hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              </form>
            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* THE PHYSICAL SLIDING BLACK PANEL (OVERLAY)                */}
          {/* Slides smoothly from left (signup) to right (login)       */}
          {/* ======================================================== */}
          <motion.div
            animate={{
              x: mode === 'signup' ? '0%' : '88.68%',
              clipPath:
                mode === 'signup'
                  ? 'polygon(0% 0%, 100% 0%, 75% 100%, 0% 100%)'
                  : 'polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)',
            }}
            transition={{
              duration: 0.68,
              ease: [0.65, 0, 0.35, 1], // cinematic glide
            }}
            className="absolute top-0 bottom-0 left-0 w-[53%] bg-stone-950 text-white z-20 flex flex-col justify-center shadow-2xl overflow-hidden pointer-events-none select-none"
          >
            {/* Background subtle graphic accent */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative w-full h-full flex flex-col justify-center px-8 sm:px-12">
              <AnimatePresence mode="wait">
                {mode === 'signup' ? (
                  <motion.div
                    key="overlay-signup-text"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                    className="max-w-[260px] mr-auto space-y-4 text-left"
                  >
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] font-bold text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Taizer Crypto</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                      WELCOME
                      <br />
                      BACK!
                    </h1>

                    <p className="text-xs text-stone-300 leading-relaxed font-medium">
                      Enter your personal details to begin your 30-day crypto trading target journey.
                    </p>

                    <div className="pt-2 flex items-center space-x-2 text-stone-400 text-[11px] font-mono">
                      <span>Tiered Targets</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">10-Step Growth</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="overlay-login-text"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                    className="max-w-[260px] ml-auto space-y-4 text-right"
                  >
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] font-bold text-emerald-400 ml-auto">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Taizer Crypto</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                      HELLO,
                      <br />
                      TRADER!
                    </h1>

                    <p className="text-xs text-stone-300 leading-relaxed font-medium">
                      To keep connected with your trading records and daily targets please login with your personal info.
                    </p>

                    <div className="pt-2 flex items-center justify-end space-x-2 text-stone-400 text-[11px] font-mono">
                      <span>30-Day Discipline</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">Daily Profit</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ======================================================== */}
        {/* MOBILE VIEW (Screens < 640px): Only ONE form at a time    */}
        {/* ======================================================== */}
        <div className="sm:hidden flex flex-col">
          {/* Top Slanted Black Header */}
          <div
            className="bg-stone-950 text-white p-6 pt-7 relative overflow-hidden"
            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 90%, 0% 100%)' }}
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <TaizerLogo size="sm" showText={false} />
                <span className="text-xs font-bold text-emerald-400">Taizer Crypto</span>
              </div>
              <div className="flex bg-stone-900 rounded-lg p-0.5 border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white text-stone-950' : 'text-stone-400'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-white text-stone-950' : 'text-stone-400'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-black uppercase text-white tracking-tight mt-2">
              WELCOME BACK!
            </h1>
            <p className="text-[11px] text-stone-300 mt-1 pb-2">
              {mode === 'signup'
                ? 'Register to start your 30-day profit target plan.'
                : 'Login with your credentials to access your daily targets.'}
            </p>
          </div>

          {/* Mobile Active Form: Animated Slide Between Login and Signup */}
          <div className="p-6 pt-3 space-y-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {mode === 'signup' ? (
                <motion.div
                  key="mobile-signup-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <h2 className="text-xl font-black text-stone-950">Sign Up</h2>
                    <div className="w-8 h-1 bg-stone-950 rounded-full mx-auto mt-1" />
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-semibold text-stone-600 block">Username</label>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                        <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <User className="w-3.5 h-3.5 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[11px] font-semibold text-stone-600 block">Email</label>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                        <input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <Mail className="w-3.5 h-3.5 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[11px] font-semibold text-stone-600 block">Password</label>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent pr-14 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-stone-500 hover:text-stone-950 transition-colors cursor-pointer p-0.5"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5 text-stone-800" /> : <Eye className="w-3.5 h-3.5 text-stone-600" />}
                          </button>
                          <Lock className="w-3.5 h-3.5 text-stone-700 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="font-semibold text-stone-600">Wallet Balance (USD)</label>
                        <span className="font-mono text-emerald-700 font-bold text-[10px]">
                          ${tierInfo.dailyTarget}/day
                        </span>
                      </div>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                        <input
                          type="number"
                          min="10"
                          step="any"
                          placeholder="Starting Wallet ($10 min)"
                          value={walletStr}
                          onChange={(e) => setWalletStr(e.target.value)}
                          className="w-full bg-transparent pr-7 text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <Wallet className="w-3.5 h-3.5 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-5 bg-stone-950 hover:bg-stone-800 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer mt-2"
                    >
                      Sign Up
                    </button>

                    <p className="text-xs text-center text-stone-600 pt-1">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="font-bold text-stone-950 underline cursor-pointer"
                      >
                        Login
                      </button>
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <h2 className="text-xl font-black text-stone-950">Login</h2>
                    <div className="w-8 h-1 bg-stone-950 rounded-full mx-auto mt-1" />
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-600 block">Username</label>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1.5">
                        <input
                          type="text"
                          placeholder="Username or Email"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="w-full bg-transparent pr-7 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <User className="w-4 h-4 text-stone-700 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-600 block">Password</label>
                      <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1.5">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-transparent pr-14 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="text-stone-500 hover:text-stone-950 transition-colors cursor-pointer p-0.5"
                          >
                            {showLoginPassword ? <EyeOff className="w-3.5 h-3.5 text-stone-800" /> : <Eye className="w-3.5 h-3.5 text-stone-600" />}
                          </button>
                          <Lock className="w-4 h-4 text-stone-700 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-5 bg-stone-950 hover:bg-stone-800 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer mt-2"
                    >
                      Login
                    </button>

                    <p className="text-xs text-center text-stone-600 pt-1">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setError(null);
                        }}
                        className="font-bold text-stone-950 underline cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
