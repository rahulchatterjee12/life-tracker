'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, OtpActionType } from '@/components/providers/AuthProvider';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  Sparkles,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

type AuthModalView =
  | 'signin'
  | 'signup'
  | 'verify_signup_otp'
  | 'forgot_request'
  | 'forgot_verify';

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'signin',
}: AuthModalProps) {
  const { login, sendOtp, verifyOtp } = useAuth();
  const [view, setView] = useState<AuthModalView>(defaultMode);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Status & feedback
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync mode with props
  useEffect(() => {
    if (isOpen) {
      setView(defaultMode);
      setError(null);
      setInfoMessage(null);
      setOtp('');
    }
  }, [isOpen, defaultMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle Standard Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email.trim(), password);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Invalid email or password');
    }
  };

  // Handle Initiating Signup -> Sending OTP
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const res = await sendOtp(email.trim(), 'SIGNUP', name.trim(), password);
    setIsSubmitting(false);

    if (res.success) {
      setInfoMessage(res.message || `Verification code sent to ${email}`);
      setResendCooldown(60);
      setView('verify_signup_otp');
    } else {
      setError(res.error || 'Failed to send verification code');
    }
  };

  // Handle Verifying Signup OTP
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(email.trim(), otp.trim(), 'SIGNUP');
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Invalid or expired verification code');
    }
  };

  // Handle Forgot Password Request (send OTP)
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your registered email address');
      return;
    }

    setIsSubmitting(true);
    const res = await sendOtp(email.trim(), 'FORGOT_PASSWORD');
    setIsSubmitting(false);

    if (res.success) {
      setInfoMessage(res.message || `Password reset code sent to ${email}`);
      setResendCooldown(60);
      setView('forgot_verify');
    } else {
      setError(res.error || 'Failed to send reset code');
    }
  };

  // Handle Forgot Password Reset with OTP & New Password
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(email.trim(), otp.trim(), 'FORGOT_PASSWORD', newPassword);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to reset password');
    }
  };

  // Resend OTP Helper
  const handleResend = async (type: OtpActionType) => {
    if (resendCooldown > 0) return;
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const res = await sendOtp(
      email.trim(),
      type,
      type === 'SIGNUP' ? name.trim() : undefined,
      type === 'SIGNUP' ? password : undefined
    );
    setIsSubmitting(false);

    if (res.success) {
      setInfoMessage(`A fresh verification code was sent to ${email}`);
      setResendCooldown(60);
    } else {
      setError(res.error || 'Failed to resend code');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm p-6 sm:p-7 rounded-2xl bg-surface border border-border shadow-2xl text-txt space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
                {view === 'verify_signup_otp' || view === 'forgot_verify' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : view === 'forgot_request' ? (
                  <KeyRound className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </span>
              <h3 className="text-base font-semibold text-txt">
                {view === 'signin' && 'Sign In to Life Metric'}
                {view === 'signup' && 'Create Your Account'}
                {view === 'verify_signup_otp' && 'Verify Your Email'}
                {view === 'forgot_request' && 'Reset Your Password'}
                {view === 'forgot_verify' && 'Enter Reset Code'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Control for Sign In / Sign Up */}
          {(view === 'signin' || view === 'signup') && (
            <div className="flex p-0.5 bg-surface-2 rounded-xl border border-border-light">
              <button
                type="button"
                onClick={() => {
                  setView('signin');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  view === 'signin'
                    ? 'bg-bg text-txt font-semibold shadow-xs'
                    : 'text-txt-2 hover:text-txt'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('signup');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  view === 'signup'
                    ? 'bg-bg text-txt font-semibold shadow-xs'
                    : 'text-txt-2 hover:text-txt'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-bad/10 border border-bad/20 text-bad text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-accent" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ================= VIEW 1: SIGN IN ================= */}
          {view === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium uppercase text-txt-2">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot_request');
                      setError(null);
                      setInfoMessage(null);
                      setOtp('');
                    }}
                    className="text-[11px] text-accent hover:underline cursor-pointer font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sign In</span>
              </button>
            </form>
          )}

          {/* ================= VIEW 2: SIGN UP ================= */}
          {view === 'signup' && (
            <form onSubmit={handleInitiateSignup} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Verification Code</span>
              </button>

              <p className="text-[11px] text-txt-3 text-center">
                We will email an OTP to verify that you own this address.
              </p>
            </form>
          )}

          {/* ================= VIEW 3: VERIFY SIGNUP OTP ================= */}
          {view === 'verify_signup_otp' && (
            <form onSubmit={handleVerifySignupOtp} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <p className="text-xs text-txt-2">
                  Enter the 6-digit code sent to:
                </p>
                <p className="text-xs font-semibold text-txt font-mono bg-surface-2 py-1 px-2.5 rounded-lg inline-block border border-border-light">
                  {email}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2.5 text-center tracking-[0.4em] font-mono font-bold text-lg rounded-xl bg-bg border border-border text-accent placeholder-txt-3 focus:outline-hidden focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify &amp; Create Account</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setError(null);
                    setOtp('');
                  }}
                  className="flex items-center gap-1 text-txt-3 hover:text-txt cursor-pointer transition"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change email</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSubmitting}
                  onClick={() => handleResend('SIGNUP')}
                  className="flex items-center gap-1 text-accent hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW 4: FORGOT PASSWORD REQUEST ================= */}
          {view === 'forgot_request' && (
            <form onSubmit={handleForgotRequest} className="space-y-3.5">
              <p className="text-xs text-txt-2 leading-relaxed">
                Enter your account email. We will send you a 6-digit OTP to verify your identity and reset your password.
              </p>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Reset Code</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView('signin');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs text-txt-3 hover:text-txt cursor-pointer mx-auto transition"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW 5: FORGOT PASSWORD RESET WITH OTP ================= */}
          {view === 'forgot_verify' && (
            <form onSubmit={handleForgotReset} className="space-y-3">
              <div className="space-y-1 text-center">
                <p className="text-xs text-txt-2">Reset code sent to:</p>
                <p className="text-xs font-semibold text-txt font-mono bg-surface-2 py-0.5 px-2 rounded-lg inline-block border border-border-light">
                  {email}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2 text-center tracking-[0.35em] font-mono font-bold text-base rounded-xl bg-bg border border-border text-accent placeholder-txt-3 focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6 || newPassword.length < 6}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-1"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Reset Password &amp; Sign In</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot_request');
                    setError(null);
                  }}
                  className="flex items-center gap-1 text-txt-3 hover:text-txt cursor-pointer transition"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSubmitting}
                  onClick={() => handleResend('FORGOT_PASSWORD')}
                  className="flex items-center gap-1 text-accent hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Info */}
          <div className="pt-2 border-t border-border-light text-center">
            <p className="text-[11px] text-txt-3">
              {view === 'signin' && 'Sign in to access your streaks, focus timers, and rewards.'}
              {view === 'signup' && 'OTP verification ensures account ownership and security.'}
              {view === 'verify_signup_otp' && 'Never share your OTP with anyone.'}
              {(view === 'forgot_request' || view === 'forgot_verify') &&
                'Password reset codes expire automatically after 10 minutes.'}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
