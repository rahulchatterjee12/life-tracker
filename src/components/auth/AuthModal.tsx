'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { X, Lock, Mail, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'signin',
}: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name');
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsSubmitting(false);
        return;
      }
      const res = await signup(name.trim(), email.trim(), password);
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to create account');
      }
    } else {
      const res = await login(email.trim(), password);
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Invalid email or password');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm p-6 sm:p-7 rounded-2xl bg-surface border border-border shadow-2xl text-txt space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-semibold text-txt">
                {mode === 'signin' ? 'Sign In to Life Metric' : 'Create an Account'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Control */}
          <div className="flex p-0.5 bg-surface-2 rounded-xl border border-border-light">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                mode === 'signin'
                  ? 'bg-bg text-txt font-semibold shadow-sm'
                  : 'text-txt-2 hover:text-txt'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-bg text-txt font-semibold shadow-sm'
                  : 'text-txt-2 hover:text-txt'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-bad/10 border border-bad/20 text-bad text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-txt-3" />
                  <input
                    type="text"
                    required
                    placeholder="Steve Jobs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>
            )}

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
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>

          {/* Footer Info */}
          <div className="pt-2 border-t border-border-light text-center">
            <p className="text-[11px] text-txt-3">
              {mode === 'signin'
                ? 'Your progress and rewards are saved directly to MongoDB.'
                : 'Signing up gives you 1 free Streak Freeze to protect your habits!'}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

