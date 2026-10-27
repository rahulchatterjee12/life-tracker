'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Flame,
  Award,
  Clock,
  Wallet,
  Snowflake,
  Sparkles,
  Lock,
  KeyRound,
  Edit3,
  Check,
  X,
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Coins,
  History,
  TrendingUp,
  Bot,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt?: string;
  vaultBalance: number;
  totalPointsEarned: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezesCount: number;
  hasCustomGeminiKey?: boolean;
  geminiApiKey?: string;
  currencyPeg?: {
    pointsPerUnit: number;
    currencyCode: string;
    symbol: string;
  };
  badges: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: string | Date;
    icon: string;
  }>;
}

interface ActivityStats {
  deepWork: {
    totalMinutes: number;
    completedSessions: number;
    liveSessions: number;
  };
  habits: {
    total: number;
    completedToday: number;
  };
  admin: {
    total: number;
    completed: number;
  };
  frogs: {
    totalConquered: number;
    conqueredBeforeNoon: number;
  };
}

interface TransactionItem {
  _id: string;
  type: string;
  pointsDelta: number;
  resultingBalance: number;
  description: string;
  createdAt: string;
}

export default function UserProfileView() {
  const { user, updateUser, sendOtp, verifyOtp, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit details state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCurrencySymbol, setEditCurrencySymbol] = useState('₹');
  const [editCurrencyCode, setEditCurrencyCode] = useState('INR');
  const [editPointsPerUnit, setEditPointsPerUnit] = useState(10);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password state
  const [passwordChangeStep, setPasswordChangeStep] = useState<'idle' | 'otp_sent' | 'success'>('idle');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Gemini API Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeyMessage, setGeminiKeyMessage] = useState<{ type: 'ok' | 'bad'; text: string } | null>(null);
  const [showGeminiInstructions, setShowGeminiInstructions] = useState(true);

  // Load profile data from API
  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setStats(data.stats);
        setTransactions(data.recentActivity || []);
        setEditName(data.profile.name);
        if (data.profile.geminiApiKey) {
          setGeminiKeyInput(data.profile.geminiApiKey);
        }
        if (data.profile.currencyPeg) {
          setEditCurrencySymbol(data.profile.currencyPeg.symbol || '₹');
          setEditCurrencyCode(data.profile.currencyPeg.currencyCode || 'INR');
          setEditPointsPerUnit(data.profile.currencyPeg.pointsPerUnit || 10);
        }
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeminiKey = async (keyToSave?: string) => {
    setIsSavingGeminiKey(true);
    setGeminiKeyMessage(null);
    const value = keyToSave !== undefined ? keyToSave : geminiKeyInput.trim();

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: value,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                hasCustomGeminiKey: Boolean(value),
                geminiApiKey: value,
              }
            : null
        );
        if (keyToSave === '') {
          setGeminiKeyInput('');
        }
        setGeminiKeyMessage({
          type: 'ok',
          text: value
            ? 'Gemini API Key successfully saved and activated!'
            : 'Gemini API Key removed. AI features will use system defaults.',
        });
        setTimeout(() => setGeminiKeyMessage(null), 4000);
      } else {
        setGeminiKeyMessage({
          type: 'bad',
          text: data.error || 'Failed to save Gemini API Key',
        });
      }
    } catch {
      setGeminiKeyMessage({
        type: 'bad',
        text: 'Network error while saving Gemini API Key',
      });
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle Save Profile Basic Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaveSuccess(false);

    if (!editName.trim()) {
      setProfileError('Name cannot be empty');
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          currencyPeg: {
            symbol: editCurrencySymbol.trim(),
            currencyCode: editCurrencyCode.trim().toUpperCase(),
            pointsPerUnit: Number(editPointsPerUnit) || 10,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile((prev) => (prev ? { ...prev, ...data.user } : null));
        updateUser(data.user);
        setProfileSaveSuccess(true);
        setIsEditingProfile(false);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch {
      setProfileError('Network error while updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Request Password Change OTP
  const handleRequestPasswordOtp = async () => {
    if (!profile?.email) return;
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsSubmittingPassword(true);

    const res = await sendOtp(profile.email, 'CHANGE_PASSWORD');
    setIsSubmittingPassword(false);

    if (res.success) {
      setPasswordChangeStep('otp_sent');
      setResendCooldown(60);
    } else {
      setPasswordError(res.error || 'Failed to send OTP code');
    }
  };

  // Handle Verify OTP & Change Password
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;
    setPasswordError(null);

    if (passwordOtp.trim().length !== 6) {
      setPasswordError('Please enter the 6-digit OTP code');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);
    const res = await verifyOtp(profile.email, passwordOtp.trim(), 'CHANGE_PASSWORD', newPassword);
    setIsSubmittingPassword(false);

    if (res.success) {
      setPasswordSuccess('Password successfully updated!');
      setPasswordChangeStep('success');
      setPasswordOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordChangeStep('idle');
        setPasswordSuccess(null);
      }, 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-txt-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs">Loading profile and activity metrics...</p>
      </div>
    );
  }

  const activeProfile: ProfileData = profile || {
    id: user?.id || 'demo-user',
    name: user?.name || 'Lead Architect',
    email: user?.email || 'lead.engineer@lifemetric.app',
    isEmailVerified: true,
    createdAt: user?.createdAt ? String(user.createdAt) : undefined,
    vaultBalance: user?.vaultBalance || 0,
    totalPointsEarned: user?.totalPointsEarned || 0,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
    streakFreezesCount: user?.streakFreezesCount || 0,
    badges: user?.badges || [],
    hasCustomGeminiKey: false,
    geminiApiKey: '',
    currencyPeg: user?.currencyPeg || { pointsPerUnit: 10, currencyCode: 'INR', symbol: '₹' },
  };

  const memberSince = activeProfile.createdAt
    ? new Date(activeProfile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent Member';

  const currencyValue = Math.floor(
    activeProfile.vaultBalance / (activeProfile.currencyPeg?.pointsPerUnit || 10)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner & User ID Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border-light shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Avatar Initials */}
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-accent to-accent-hover text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              {activeProfile.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-txt truncate">
                  {activeProfile.name}
                </h2>
                {activeProfile.isEmailVerified ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ok/10 text-ok text-[11px] font-semibold"
                    title="Verified Email Address"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warn/10 text-warn text-[11px] font-semibold">
                    <span>Unverified</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-txt-3 mt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{activeProfile.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {memberSince}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setIsEditingProfile(!isEditingProfile);
                setProfileError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-border-light text-xs font-semibold text-txt transition cursor-pointer border border-border-light"
            >
              <Edit3 className="w-3.5 h-3.5 text-accent" />
              <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bad/10 hover:bg-bad/20 text-xs font-semibold text-bad transition cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Profile Success Toast */}
        {profileSaveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-ok/10 border border-ok/20 text-ok text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        {/* Profile Edit Inline Panel */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 pt-5 border-t border-border-light space-y-4"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-txt-2">
              Edit Basic Profile Information
            </h4>

            {profileError && (
              <div className="p-3 rounded-xl bg-bad/10 border border-bad/20 text-bad text-xs font-medium">
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-txt-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-txt-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={editCurrencySymbol}
                  onChange={(e) => setEditCurrencySymbol(e.target.value)}
                  placeholder="₹ or $ or €"
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-txt-2">
                  Currency Code
                </label>
                <input
                  type="text"
                  required
                  value={editCurrencyCode}
                  onChange={(e) => setEditCurrencyCode(e.target.value)}
                  placeholder="INR, USD, EUR"
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-txt-2">
                  Points Per Currency Unit
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editPointsPerUnit}
                  onChange={(e) => setEditPointsPerUnit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                />
                <span className="text-[10px] text-txt-3">
                  e.g. 10 points = 1 {editCurrencySymbol}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-border-light text-xs font-medium text-txt-2 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Vault Balance */}
        <div className="p-4 rounded-2xl bg-surface border border-border-light relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-txt-2 font-medium">
            <span>Vault Balance</span>
            <Wallet className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-txt mt-2">{activeProfile.vaultBalance}</p>
          <p className="text-[11px] text-txt-3 mt-0.5">
            Equivalent to {activeProfile.currencyPeg?.symbol || '₹'}
            {currencyValue}
          </p>
        </div>

        {/* Current Active Streak */}
        <div className="p-4 rounded-2xl bg-surface border border-border-light relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-txt-2 font-medium">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-warn" />
          </div>
          <p className="text-2xl font-bold text-txt mt-2">
            {activeProfile.currentStreak}{' '}
            <span className="text-sm font-normal text-txt-3">days</span>
          </p>
          <p className="text-[11px] text-txt-3 mt-0.5">
            Longest record: {activeProfile.longestStreak} days
          </p>
        </div>

        {/* Total Points Earned */}
        <div className="p-4 rounded-2xl bg-surface border border-border-light relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-txt-2 font-medium">
            <span>Lifetime Points</span>
            <Coins className="w-4 h-4 text-ok" />
          </div>
          <p className="text-2xl font-bold text-txt mt-2">
            {activeProfile.totalPointsEarned}
          </p>
          <p className="text-[11px] text-txt-3 mt-0.5">Total gamified rewards</p>
        </div>

        {/* Streak Freezes */}
        <div className="p-4 rounded-2xl bg-surface border border-border-light relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-txt-2 font-medium">
            <span>Streak Freezes</span>
            <Snowflake className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-txt mt-2">
            {activeProfile.streakFreezesCount}
          </p>
          <p className="text-[11px] text-txt-3 mt-0.5">Active habit shields</p>
        </div>
      </div>

      {/* Activity Breakdown & Habits / Focus Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Deep Work Focus Summary */}
          <div className="p-5 rounded-2xl bg-surface border border-border-light space-y-3">
            <div className="flex items-center gap-2 text-txt font-semibold text-sm">
              <Clock className="w-4 h-4 text-accent" />
              <span>Deep Work Activity</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Total Time Focused</span>
                <span className="font-semibold text-txt">
                  {Math.floor(stats.deepWork.totalMinutes / 60)}h{' '}
                  {stats.deepWork.totalMinutes % 60}m
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Completed Sessions</span>
                <span className="font-semibold text-txt">
                  {stats.deepWork.completedSessions}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-txt-2">Live Stopwatch Focus</span>
                <span className="font-semibold text-accent">
                  {stats.deepWork.liveSessions} sessions
                </span>
              </div>
            </div>
          </div>

          {/* Habits & Daily Routine */}
          <div className="p-5 rounded-2xl bg-surface border border-border-light space-y-3">
            <div className="flex items-center gap-2 text-txt font-semibold text-sm">
              <Flame className="w-4 h-4 text-warn" />
              <span>Habit Momentum</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Configured Habits</span>
                <span className="font-semibold text-txt">{stats.habits.total}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Completed Today</span>
                <span className="font-semibold text-ok">
                  {stats.habits.completedToday} / {stats.habits.total}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-txt-2">Admin Tasks Completed</span>
                <span className="font-semibold text-txt">{stats.admin.completed}</span>
              </div>
            </div>
          </div>

          {/* Eat That Frog Mastery */}
          <div className="p-5 rounded-2xl bg-surface border border-border-light space-y-3">
            <div className="flex items-center gap-2 text-txt font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-warn" />
              <span>Frog Execution</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Total Frogs Conquered</span>
                <span className="font-semibold text-txt">
                  {stats.frogs.totalConquered}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-light">
                <span className="text-txt-2">Conquered Before Noon (2x)</span>
                <span className="font-semibold text-warn">
                  {stats.frogs.conqueredBeforeNoon}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-txt-2">Morning Multiplier Rate</span>
                <span className="font-semibold text-txt">
                  {stats.frogs.totalConquered > 0
                    ? Math.round(
                        (stats.frogs.conqueredBeforeNoon / stats.frogs.totalConquered) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges & Achievements Gallery */}
      <div className="p-6 rounded-2xl bg-surface border border-border-light space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-txt font-semibold text-sm">
            <Award className="w-4 h-4 text-accent" />
            <span>Unlocked Badges &amp; Rewards</span>
          </div>
          <span className="text-xs text-txt-3">
            {activeProfile.badges.length} unlocked
          </span>
        </div>

        {activeProfile.badges.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-surface-2/50 border border-dashed border-border-light">
            <p className="text-xs text-txt-3">
              No badges unlocked yet. Complete tasks and redeem catalog milestones in The Vault to earn badges!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeProfile.badges.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-surface-2 border border-border-light flex items-start gap-3"
              >
                <span className="text-2xl shrink-0 p-1 rounded-lg bg-bg">
                  {b.icon || '🏆'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-txt truncate">{b.title}</p>
                  <p className="text-[11px] text-txt-3 mt-0.5 line-clamp-2">
                    {b.description}
                  </p>
                  <p className="text-[10px] text-accent mt-1">
                    Unlocked{' '}
                    {new Date(b.unlockedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Coaching & Google Gemini API Key Configuration */}
      <div className="p-6 rounded-2xl bg-surface border border-border-light space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-txt">
                AI Coaching &amp; Gemini Integration
              </h3>
              <p className="text-xs text-txt-3">
                Power your weekly retrospectives and executive coaching with Google Gemini AI.
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto">
            {activeProfile.hasCustomGeminiKey ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ok/10 border border-ok/20 text-ok text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Custom Key Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border-light text-txt-2 text-[11px] font-medium">
                <Bot className="w-3.5 h-3.5 text-txt-3" />
                <span>Default / Fallback</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {geminiKeyMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              geminiKeyMessage.type === 'ok'
                ? 'bg-ok/10 border-ok/20 text-ok'
                : 'bg-bad/10 border-bad/20 text-bad'
            }`}
          >
            {geminiKeyMessage.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <X className="w-4 h-4 shrink-0" />
            )}
            <span>{geminiKeyMessage.text}</span>
          </div>
        )}

        {/* Key Input & Actions */}
        <div className="p-4 rounded-xl bg-surface-2 border border-border-light space-y-3">
          <label className="block text-[11px] font-medium uppercase text-txt-2">
            Google Gemini API Key
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                placeholder="Paste your AIzaSy... key here"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-bg border border-border text-xs text-txt font-mono placeholder-txt-3 focus:outline-hidden focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt cursor-pointer p-0.5"
                title={showGeminiKey ? 'Hide API Key' : 'Reveal API Key'}
              >
                {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isSavingGeminiKey}
                onClick={() => handleSaveGeminiKey()}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSavingGeminiKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Check className="w-3.5 h-3.5" />
                <span>Save Key</span>
              </button>

              {activeProfile.hasCustomGeminiKey && (
                <button
                  type="button"
                  disabled={isSavingGeminiKey}
                  onClick={() => handleSaveGeminiKey('')}
                  className="px-3 py-2 rounded-xl bg-bad/10 hover:bg-bad/20 text-bad text-xs font-medium transition cursor-pointer"
                  title="Remove saved key and revert to system defaults"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Step-by-Step Instructions */}
        <div className="rounded-xl border border-border-light bg-surface-2/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGeminiInstructions(!showGeminiInstructions)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-txt hover:bg-surface-2 cursor-pointer transition text-left"
          >
            <div className="flex items-center gap-2 text-accent">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">How to get a Free Google Gemini API Key</span>
            </div>
            {showGeminiInstructions ? (
              <ChevronUp className="w-4 h-4 text-txt-3" />
            ) : (
              <ChevronDown className="w-4 h-4 text-txt-3" />
            )}
          </button>

          {showGeminiInstructions && (
            <div className="px-4 pb-4 pt-1 border-t border-border-light space-y-3 text-xs text-txt-2">
              <p className="text-txt-3 leading-relaxed">
                Google provides a <strong>100% free tier</strong> for developers and individuals. No credit card is required:
              </p>

              <ol className="space-y-2 list-decimal list-inside text-txt-2 leading-relaxed pl-1">
                <li>
                  Open{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-semibold underline hover:text-accent-hover"
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  in your browser.
                </li>
                <li>Sign in using any free personal Google Account.</li>
                <li>
                  Click the blue <span className="font-semibold text-txt">"Create API Key"</span> button.
                </li>
                <li>
                  Select or create a new project (Google handles this automatically in 1 click).
                </li>
                <li>
                  Copy your newly created key (starts with <code className="bg-bg px-1.5 py-0.5 rounded text-accent font-mono">AIzaSy...</code>).
                </li>
                <li>
                  Paste it into the field above and click <span className="font-semibold text-txt">"Save Key"</span>.
                </li>
              </ol>

              <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-[11px] text-txt-2 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  The free tier includes <strong>15 requests per minute (RPM)</strong> and over 1,500 requests per day at zero cost. Your key is stored securely in your private profile.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Management & Security (With OTP Verification) */}
      <div className="p-6 rounded-2xl bg-surface border border-border-light space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <KeyRound className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-txt">Account Security &amp; Password</h3>
              <p className="text-xs text-txt-3">
                Change your password safely with email OTP verification.
              </p>
            </div>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-ok/10 border border-ok/20 text-ok text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 rounded-xl bg-bad/10 border border-bad/20 text-bad text-xs font-medium">
            {passwordError}
          </div>
        )}

        {passwordChangeStep === 'idle' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-2 border border-border-light">
            <div className="text-xs text-txt-2">
              <p className="font-medium text-txt">Change Your Password</p>
              <p className="text-txt-3 mt-0.5">
                We will send a 6-digit OTP code to <strong className="text-txt">{activeProfile.email}</strong> to verify your identity.
              </p>
            </div>
            <button
              type="button"
              disabled={isSubmittingPassword}
              onClick={handleRequestPasswordOtp}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
            >
              {isSubmittingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <KeyRound className="w-3.5 h-3.5" />
              <span>Send Password OTP</span>
            </button>
          </div>
        )}

        {passwordChangeStep === 'otp_sent' && (
          <form
            onSubmit={handleSubmitPasswordChange}
            className="p-5 rounded-xl bg-surface-2 border border-border-light space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-txt">Verify OTP &amp; Set New Password</p>
                <p className="text-[11px] text-txt-3 mt-0.5">
                  Enter the 6-digit code sent to {activeProfile.email}
                </p>
              </div>
              <button
                type="button"
                disabled={resendCooldown > 0 || isSubmittingPassword}
                onClick={handleRequestPasswordOtp}
                className="text-xs text-accent hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  pattern="[0-9]{6}"
                  value={passwordOtp}
                  onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2 text-center tracking-[0.3em] font-mono font-bold text-base rounded-xl bg-bg border border-border text-accent focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase text-txt-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={
                  isSubmittingPassword ||
                  passwordOtp.length !== 6 ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmittingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Check className="w-3.5 h-3.5" />
                <span>Confirm &amp; Update Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordChangeStep('idle');
                  setPasswordError(null);
                  setPasswordOtp('');
                }}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-border-light text-xs font-medium text-txt-2 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent Activity / Double-Entry Ledger History */}
      <div className="p-6 rounded-2xl bg-surface border border-border-light space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-txt font-semibold text-sm">
            <History className="w-4 h-4 text-txt-2" />
            <span>Recent Activity Log</span>
          </div>
          <span className="text-xs text-txt-3">
            Last {transactions.length} entries
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-2/40 border border-dashed border-border-light">
            <p className="text-xs text-txt-3">
              No activity recorded yet. Complete habits, run focus sessions, and redeem rewards to generate transaction history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-light border border-border-light rounded-xl overflow-hidden">
            {transactions.map((tx) => {
              const isPositive = tx.pointsDelta >= 0;
              const dateStr = new Date(tx.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={tx._id}
                  className="px-4 py-3 bg-surface hover:bg-surface-2/60 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-txt truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-txt-3 mt-0.5">
                      <span className="font-mono">{tx.type}</span>
                      <span>&bull;</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono font-semibold text-xs ${
                        isPositive ? 'text-ok' : 'text-warn'
                      }`}
                    >
                      {isPositive ? `+${tx.pointsDelta}` : tx.pointsDelta} pts
                    </span>
                    <p className="text-[10px] text-txt-3 font-mono mt-0.5">
                      bal: {tx.resultingBalance}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
