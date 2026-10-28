'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import AuthModal from '@/components/auth/AuthModal';
import {
  Flame,
  Sparkles,
  Clock,
  Bot,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
  Sun,
  Moon,
  ChevronRight,
  Star,
  Target,
  Snowflake,
  TrendingUp,
  Cpu,
  Award,
  Layers,
  Check,
  Compass,
} from 'lucide-react';

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const { theme, toggle } = useTheme();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // If already authenticated, smoothly forward to the dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  // Check URL query parameters for ?auth=signin or ?auth=signup
  useEffect(() => {
    const authQuery = searchParams.get('auth');
    if (authQuery === 'signin') {
      setAuthModalMode('signin');
      setIsAuthModalOpen(true);
    } else if (authQuery === 'signup') {
      setAuthModalMode('signup');
      setIsAuthModalOpen(true);
    }
  }, [searchParams]);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // While checking auth state or during redirect, show high-polish loader
  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-fg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-accent/25 animate-pulse">
            LM
          </div>
          <p className="text-xs text-txt-3 font-medium">
            {isLoading ? 'Checking authentication...' : 'Redirecting to your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col selection:bg-accent/20 selection:text-accent font-sans">
      {/* Auth Modal overlay */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          router.push('/dashboard');
        }}
      />

      {/* ================= HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-bg/85 border-b border-border-light transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm shadow-md shadow-accent/25 group-hover:scale-105 transition-transform">
              LM
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-txt tracking-tight leading-none group-hover:text-accent transition-colors">
                Life Metric
              </span>
              <span className="text-[10px] text-txt-3 font-medium mt-0.5">Focus &amp; Habit OS</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-txt-2">
            <a href="#features" className="hover:text-txt transition-colors">
              Features
            </a>
            <a href="#mechanics" className="hover:text-txt transition-colors">
              The Science
            </a>
            <a href="#vault" className="hover:text-txt transition-colors">
              The Vault
            </a>
            <a href="#ai-coaching" className="hover:text-txt transition-colors">
              Gemini AI
            </a>
            <a href="#pricing" className="hover:text-txt transition-colors">
              Pricing
            </a>
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-xl text-txt-2 hover:text-txt hover:bg-surface-2 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => openAuth('signin')}
              className="px-3.5 py-2 text-xs font-medium text-txt hover:text-accent transition cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() => openAuth('signup')}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm shadow-accent/20 hover:shadow-md hover:shadow-accent/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border-light">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Behavioral Momentum Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-txt tracking-tight leading-[1.12]">
            Transform Focus into Momentum.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent-hover to-accent">
              Turn Execution into Currency.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-txt-2 leading-relaxed">
            Eliminate procrastination with Brian Tracy’s <strong className="text-txt font-semibold">Eat That Frog</strong> morning multipliers, live stopwatch flow, habit streak consistency matrices, real-world monetary reward pegging, and automated <strong className="text-txt font-semibold">Gemini AI weekly coaching</strong>.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuth('signup')}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <span>Start Free with Email OTP</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="#preview"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface hover:bg-surface-2 border border-border-light text-txt text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Explore Interactive Mechanics</span>
              <ChevronRight className="w-4 h-4 text-txt-3" />
            </a>
          </div>

          {/* Trust badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-txt-3">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> 100% Free Forever
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> Zero Mock Data
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> BYO Free Gemini Key
            </span>
          </div>

          {/* ================= INTERACTIVE PREVIEW MOCKUP ================= */}
          <div id="preview" className="pt-10 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
              {/* Mockup Topbar */}
              <div className="flex items-center justify-between pb-4 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-bad/80" />
                  <div className="w-3 h-3 rounded-full bg-warn/80" />
                  <div className="w-3 h-3 rounded-full bg-ok/80" />
                  <span className="ml-2 text-xs font-mono text-txt-3 hidden sm:inline">
                    lifemetric.app/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-ok/15 text-ok font-mono font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                    Live Session
                  </span>
                  <span className="text-xs font-semibold text-txt">1,250 pts</span>
                </div>
              </div>

              {/* Mockup Core Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Eat That Frog Card */}
                <div className="p-4 rounded-2xl bg-warn/10 border border-warn/25 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-warn uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Today&apos;s Frog</span>
                    </div>
                    <p className="text-sm font-semibold text-txt pt-1">
                      Finalize Core Architecture &amp; API Routes
                    </p>
                    <p className="text-[11px] text-txt-2">
                      Completed at 10:45 AM · <strong className="text-warn font-semibold">1.5x Multiplier Awarded</strong>
                    </p>
                  </div>
                  <div className="pt-3 flex items-center justify-between text-xs border-t border-warn/20 mt-3">
                    <span className="text-txt-3">Points Earned</span>
                    <span className="font-bold text-txt">+37.5 pts</span>
                  </div>
                </div>

                {/* 2. Live Stopwatch Widget */}
                <div className="p-4 rounded-2xl bg-bg border border-border-light flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                        Deep Work Stopwatch
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                        Zen Mode
                      </span>
                    </div>
                    <div className="pt-2 text-2xl sm:text-3xl font-mono font-extrabold text-txt tracking-tight flex items-baseline gap-2">
                      <span>48:32</span>
                      <span className="text-xs text-ok font-sans font-semibold">+5 Overtime</span>
                    </div>
                    <p className="text-[11px] text-txt-3">Target duration: 45m · Anti-cheat live tracking</p>
                  </div>
                  <div className="pt-3 flex items-center justify-between border-t border-border-light mt-3">
                    <span className="text-xs text-txt-3">Sprint Status</span>
                    <span className="text-xs font-semibold text-ok flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Locked In
                    </span>
                  </div>
                </div>

                {/* 3. The Vault Currency Card */}
                <div className="p-4 rounded-2xl bg-surface-2 border border-border-light flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-txt-2 uppercase tracking-wider">The Vault</span>
                      <Wallet className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <p className="pt-1 text-2xl font-bold text-txt">
                      ₹1,250 <span className="text-xs font-normal text-txt-3">pegged</span>
                    </p>
                    <p className="text-[11px] text-txt-2">100 pts = ₹100 guilt-free real-world reward balance</p>
                  </div>
                  <div className="pt-3 flex items-center justify-between text-xs border-t border-border mt-3">
                    <span className="text-txt-3 flex items-center gap-1">
                      <Snowflake className="w-3 h-3 text-accent" /> Streak Freezes
                    </span>
                    <span className="font-semibold text-txt">2 Available</span>
                  </div>
                </div>
              </div>

              {/* Mockup Habit Matrix Row */}
              <div className="p-4 rounded-2xl bg-bg border border-border-light space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-warn" />
                    <span className="font-semibold text-txt">Consistency Matrix (Current 14-Day Streak)</span>
                  </div>
                  <span className="text-[11px] text-txt-3 font-mono">100% Completion Rate</span>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className="h-7 rounded-lg bg-ok/25 border border-ok/40 flex items-center justify-center text-[10px] font-bold text-ok"
                    >
                      ✓
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CORE FEATURES SECTION ================= */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">Engineered for High-Agency Output</span>
          <h2 className="text-2xl sm:text-4xl font-bold text-txt tracking-tight">
            Stop Guessing. Build Predictable Execution.
          </h2>
          <p className="text-sm text-txt-2">
            Most productivity tools are passive graveyard lists. Life Metric transforms daily effort into a mathematically sound behavioral game.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-warn/10 text-warn flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">Eat That Frog Multipliers</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Tackle your most intimidating task before 12:00 PM. Life Metric mathematically multiplies your completion points by <strong className="text-warn font-semibold">1.5x</strong>, driving early morning momentum.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Brian Tracy Rule</span>
              <span className="text-warn font-semibold">1.5x Morning Boost</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">Live Stopwatch &amp; Zen Mode</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Say goodbye to retroactive guesswork. Start the live stopwatch, enter full-screen distraction-free Zen Mode, and earn overtime bonuses for deep work sprints.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Anti-Retroactive</span>
              <span className="text-accent font-semibold">+5 Overtime Bonus</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-ok/10 text-ok flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">Habit Consistency Matrix</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Visualize streaks through a GitHub-style heatmap. Stack tiny atomic habits immediately after existing anchors to solidify permanent behavioral routines.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Atomic Stacking</span>
              <span className="text-ok font-semibold">Heatmap Analytics</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">The Vault: Currency Pegging</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Gamification without tangible rewards is meaningless. Peg your points to real money (₹ or $) and redeem real-world rewards like books, gym gear, or weekend dinners guilt-free.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Real Motivation</span>
              <span className="text-accent font-semibold">100 pts = ₹100</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-warn/10 text-warn flex items-center justify-center">
                <Snowflake className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">Streak Freeze Insurance</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Life happens. Purchase Streak Freezes from The Vault using earned points. If illness or travel strikes, your momentum stays protected without breaking your spirit.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Fail-Safe System</span>
              <span className="text-txt font-semibold">50 pts / Freeze</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-surface border border-border-light hover:border-accent/40 transition-colors space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-txt">Fortified Email OTP Security</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                No bot accounts or spoofed emails. Direct 6-digit OTP delivery for instant registration, password resets, and credential updates with zero third-party tracking.
              </p>
            </div>
            <div className="pt-4 border-t border-border-light text-[11px] text-txt-3 font-medium flex items-center justify-between">
              <span>Security First</span>
              <span className="text-ok font-semibold">Verified Identity</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THE SCIENCE & MECHANICS ================= */}
      <section id="mechanics" className="py-20 bg-surface/50 border-y border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">The Behavioral Science</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-txt tracking-tight">
              Why Willpower Fails, but Life Metric Works
            </h2>
            <p className="text-sm text-txt-2">
              Behavioral economics proves that immediate feedback loops and loss aversion outperform vague long-term intentions. Here is how Life Metric is calibrated:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-bg border border-border-light space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-txt">The Morning Velocity Bias</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Decision fatigue accumulates as the day progresses. By offering a 1.5x multiplier on your Frog before 12:00 PM, Life Metric creates an irresistible incentive to win the day within the first 4 hours of waking.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-bg border border-border-light space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-txt">Anti-Retroactive Integrity</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                When apps allow you to mark 4 hours of deep work retrospectively, your brain justifies illusionary productivity. Life Metric requires you to press start and stay in the session, generating true focus.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-bg border border-border-light space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-txt">Loss Aversion &amp; Safe Freezes</h3>
              <p className="text-xs text-txt-2 leading-relaxed">
                Losing a 30-day streak is psychologically devastating and leads to complete abandonment. Our streak freeze mechanic balances accountability with mercy, ensuring one tough day doesn&apos;t destroy months of habit formation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THE VAULT SECTION ================= */}
      <section id="vault" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">The Real-World Economy</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-txt tracking-tight leading-tight">
              Points That Mean Something in Real Life.
            </h2>
            <p className="text-sm text-txt-2 leading-relaxed">
              In Life Metric, points are not useless gamified pixels. The Vault allows you to tie your output directly to real-world budgets. Set your own redemption rewards with custom icons, point thresholds, and monetary equivalents.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-ok/10 text-ok mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt">Custom Reward Menu</p>
                  <p className="text-[11px] text-txt-2">Configure espresso runs (50 pts), books (250 pts), or weekend dinners (1,000 pts).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-ok/10 text-ok mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt">Dynamic Currency Peg</p>
                  <p className="text-[11px] text-txt-2">Peg 100 points to ₹100 or $100 depending on your personal budgeting framework.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-ok/10 text-ok mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt">Auditable Transaction Ledger</p>
                  <p className="text-[11px] text-txt-2">Every earned task bonus and redemption is recorded in a transparent ledger.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => openAuth('signup')}
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md shadow-accent/20 transition cursor-pointer"
              >
                Claim Your Vault Account →
              </button>
            </div>
          </div>

          {/* Visual Vault Card Mockup */}
          <div className="p-6 rounded-3xl bg-surface border border-border space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <div>
                <p className="text-xs font-semibold text-txt">The Vault Balance</p>
                <p className="text-2xl font-bold text-txt mt-0.5">
                  1,450 <span className="text-xs text-txt-2 font-normal">pts (₹1,450 Pegged)</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-txt-2 uppercase tracking-wider">Example Active Rewards</p>

              <div className="p-3 rounded-2xl bg-bg border border-border-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">☕</span>
                  <div>
                    <p className="text-xs font-semibold text-txt">Specialty Coffee Break</p>
                    <p className="text-[10px] text-txt-3">50 pts · ₹50 value</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-ok/15 text-ok text-[11px] font-semibold">Claimed ✓</span>
              </div>

              <div className="p-3 rounded-2xl bg-bg border border-border-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📚</span>
                  <div>
                    <p className="text-xs font-semibold text-txt">New Hardcover Non-Fiction Book</p>
                    <p className="text-[10px] text-txt-3">300 pts · ₹300 value</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-accent text-white text-[11px] font-semibold">Redeem</span>
              </div>

              <div className="p-3 rounded-2xl bg-bg border border-border-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🍕</span>
                  <div>
                    <p className="text-xs font-semibold text-txt">Friday Pizza Night</p>
                    <p className="text-[10px] text-txt-3">600 pts · ₹600 value</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-surface-2 text-txt-3 text-[11px] font-semibold">Locked</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AI RETROSPECTIVE COACHING SECTION ================= */}
      <section id="ai-coaching" className="py-20 bg-surface/50 border-y border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>Google Gemini AI Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-txt tracking-tight">
              An Objective Executive Coach in Your Corner
            </h2>
            <p className="text-sm text-txt-2">
              Every Sunday (or whenever you need an honest audit), Life Metric digests your task completions, habit streaks, and morning frog ratios to generate a sharp, personalized performance retrospective.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-bg border border-border-light space-y-2">
                <h4 className="text-sm font-bold text-txt flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-ok" />
                  <span>Velocity &amp; Multiplier Analysis</span>
                </h4>
                <p className="text-xs text-txt-2 leading-relaxed">
                  Evaluates whether you tackled high-importance tasks before noon or deferred them to low-energy late afternoons.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-bg border border-border-light space-y-2">
                <h4 className="text-sm font-bold text-txt flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span>Habit Adherence Breakdown</span>
                </h4>
                <p className="text-xs text-txt-2 leading-relaxed">
                  Identifies which atomic habits are flourishing and which ones need friction reduction or better anchor stacking.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-bg border border-border-light space-y-2">
                <h4 className="text-sm font-bold text-txt flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-warn" />
                  <span>Bring Your Own Free Gemini Key</span>
                </h4>
                <p className="text-xs text-txt-2 leading-relaxed">
                  No subscription fee markup. Enter your free Google AI Studio key in your profile to run unlimited Gemini 2.5 Flash retrospectives at zero cost.
                </p>
              </div>
            </div>

            {/* AI Output Sample Card */}
            <div className="p-6 rounded-3xl bg-bg border border-border-light shadow-lg space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2 font-sans font-bold text-txt">
                  <Bot className="w-4 h-4 text-accent" />
                  <span>Sunday Executive Retrospective</span>
                </div>
                <span className="text-[10px] text-txt-3">Gemini 2.5 Flash</span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 rounded-xl bg-accent/5 border border-accent/15">
                  <p className="font-semibold text-accent text-[11px] uppercase tracking-wider">Executive Summary</p>
                  <p className="text-txt mt-1 leading-relaxed">
                    &quot;Exceptional early morning velocity. You ate the frog 5 out of 7 days before 12 PM, earning a 1.5x multiplier. Total points earned: 380 pts.&quot;
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-ok text-[11px] uppercase tracking-wider">Tactical Recommendation</p>
                  <p className="text-txt-2 leading-relaxed">
                    &quot;Your deep work sessions between 2 PM and 4 PM had higher drop-off rates. Shift difficult analytical tasks strictly to your 9:00 AM window.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING SECTION ================= */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">Honest &amp; Transparent</span>
          <h2 className="text-2xl sm:text-4xl font-bold text-txt tracking-tight">
            100% Free. No Paywalls. No Ads.
          </h2>
          <p className="text-sm text-txt-2">
            Life Metric is built for high-performance individuals. All core gamification, habit tracking, and timer features are completely free.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="p-8 rounded-3xl bg-surface border-2 border-accent shadow-xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 px-4 py-1 bg-accent text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-wider">
              Complete Access
            </div>

            <div>
              <h3 className="text-xl font-bold text-txt">Life Metric Pro</h3>
              <p className="text-xs text-txt-2 mt-1">Full access to the entire momentum operating system.</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-txt tracking-tight">$0</span>
                <span className="text-xs text-txt-3">/ forever</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-txt">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Eat That Frog 1.5x Morning Multipliers</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Live Focus Stopwatch with Zen Mode &amp; Overtime</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Habit Consistency Matrix with Habit Stacking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>The Vault Economy with Real-World Currency Pegging</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Streak Freezes &amp; Achievement Badges</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Automated Gemini AI Weekly Retrospectives (BYO Free Key)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                <span>Secure Email OTP Authentication</span>
              </li>
            </ul>

            <button
              onClick={() => openAuth('signup')}
              className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/25 hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Free Today</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA BANNER ================= */}
      <section className="py-16 bg-accent text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Stop Planning. Start Executing.
          </h2>
          <p className="text-sm sm:text-base text-white/85 max-w-xl mx-auto">
            Take control of your focus today. Build unbreakable momentum, protect your streaks, and convert effort into real rewards.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openAuth('signup')}
              className="px-8 py-3.5 rounded-2xl bg-white text-accent hover:bg-white/95 text-sm font-bold shadow-xl transition cursor-pointer"
            >
              Create Your Free Account Now →
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto py-10 border-t border-border-light bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-txt-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-xs">
              LM
            </div>
            <span className="font-semibold text-txt">Life Metric</span>
            <span>· The Gamified Focus &amp; Habit Operating System</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-txt transition">Features</a>
            <a href="#vault" className="hover:text-txt transition">The Vault</a>
            <a href="#pricing" className="hover:text-txt transition">Pricing</a>
            <button
              onClick={() => openAuth('signin')}
              className="hover:text-accent transition cursor-pointer font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-white font-bold animate-pulse">
            LM
          </div>
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}
