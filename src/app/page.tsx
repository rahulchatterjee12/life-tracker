'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  setTasks,
  setSelectedCategory,
} from '@/lib/features/tasks/tasksSlice';
import { startTimer } from '@/lib/features/timer/timerSlice';
import { purchaseStreakFreeze, redeemVaultReward, setUserVaultStats } from '@/lib/features/vault/vaultSlice';
import ZenMode from '@/components/timer/ZenMode';
import HybridTimerWidget from '@/components/timer/HybridTimerWidget';
import HabitStackModal from '@/components/tasks/HabitStackModal';
import TaskManagerView from '@/components/tasks/TaskManagerView';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';
import RetrospectiveModal from '@/components/retrospective/RetrospectiveModal';
import AuthModal from '@/components/auth/AuthModal';
import HabitMatrixView from '@/components/analytics/HabitMatrixView';
import { useState, useEffect } from 'react';
import {
  Flame,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Bot,
  Sun,
  Moon,
  LayoutDashboard,
  Wallet,
  CheckCircle2,
  Circle,
  Snowflake,
  Play,
  Menu,
  X,
  LogIn,
  LogOut,
  Grid3X3,
  ListTodo,
} from 'lucide-react';

type View = 'dashboard' | 'manage' | 'vault';

export default function Home() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.tasks);
  const vault = useAppSelector((state) => state.vault);

  const [view, setView] = useState<View>('dashboard');
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [taskStatusTab, setTaskStatusTab] = useState<'pending' | 'completed'>('pending');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadDatabaseTasks() {
      try {
        const clientToday = new Date().toLocaleDateString('en-CA');
        const res = await fetch(`/api/tasks?today=${encodeURIComponent(clientToday)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          dispatch(setTasks(data.tasks));
          if (data.user) {
            dispatch(
              setUserVaultStats({
                vaultBalance: data.user.vaultBalance ?? 0,
                totalPointsEarned: data.user.totalPointsEarned ?? 0,
                streakFreezesCount: data.user.streakFreezesCount ?? 0,
                badges: data.user.badges ?? [],
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to load tasks from DB:', err);
      }
    }
    loadDatabaseTasks();
  }, [dispatch, user]);

  const selectedDetailTask = tasks.items.find((t) => String(t._id) === selectedDetailTaskId) || null;

  const handleBuyFreeze = async () => {
    try {
      const res = await fetch('/api/vault/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BUY' }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(
          setUserVaultStats({
            vaultBalance: data.vaultBalance,
            totalPointsEarned: vault.totalPointsEarned,
            streakFreezesCount: data.streakFreezesCount,
            badges: vault.badges,
          })
        );
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to purchase streak freeze:', err);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    try {
      const res = await fetch('/api/vault/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        dispatch(
          setUserVaultStats({
            vaultBalance: data.user.vaultBalance,
            totalPointsEarned: data.user.totalPointsEarned,
            streakFreezesCount: data.user.streakFreezesCount,
            badges: data.user.badges,
          })
        );
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to redeem reward:', err);
    }
  };

  const categoryTasks = tasks.items.filter((task) => {
    if (tasks.selectedCategory === 'ALL') return true;
    return task.type === tasks.selectedCategory;
  });

  const pendingTasks = categoryTasks.filter((t) => !t.completed);
  const completedTasks = categoryTasks.filter((t) => t.completed);

  const displayedTasks = taskStatusTab === 'pending' ? pendingTasks : completedTasks;

  const categoryPendingCount = pendingTasks.length;
  const categoryCompletedCount = completedTasks.length;

  const dailyFrog = tasks.items.find((t) => t.isFrog && !t.completed);
  const pendingCount = tasks.items.filter((t) => !t.completed).length;
  const completedCount = tasks.items.filter((t) => t.completed).length;

  const sidebarNav = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'manage' as View, label: 'Manage Tasks', icon: ListTodo },
    { id: 'vault' as View, label: 'The Vault', icon: Wallet },
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row bg-bg text-fg">
      {/* Overlays */}
      <ZenMode />
      <HabitStackModal />
      <RetrospectiveModal isOpen={isRetroModalOpen} onClose={() => setIsRetroModalOpen(false)} />
      <TaskDetailModal
        isOpen={Boolean(selectedDetailTask)}
        onClose={() => setSelectedDetailTaskId(null)}
        task={selectedDetailTask}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

      {/* === SIDEBAR (desktop) === */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 border-r border-border bg-surface h-full shrink-0">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-base font-semibold text-txt tracking-tight">Life Metric</h1>
          <p className="text-[11px] text-txt-2 mt-0.5">Focus · Habits · Execution</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition cursor-pointer ${
                  view === item.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-txt-2 hover:bg-surface-2 hover:text-txt'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsRetroModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-txt-2 hover:bg-surface-2 hover:text-txt transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>AI Coaching</span>
          </button>
        </nav>

        {/* Sidebar Stats */}
        <div className="px-5 py-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-txt-2">Vault Balance</span>
            <span className="font-semibold text-txt">
              {vault.vaultBalance} pts
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-txt-2">Streak Freezes</span>
            <span className="font-semibold text-txt flex items-center gap-1">
              <Snowflake className="w-3 h-3 text-accent" />
              {vault.streakFreezesCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-txt-2">Pending Tasks</span>
            <span className="font-semibold text-txt">{pendingCount}</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={toggle}
            className="flex items-center gap-2 text-xs text-txt-2 hover:text-txt transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* User Account / Profile */}
        <div className="px-5 py-3 border-t border-border">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-txt truncate">{user.name}</p>
                  <p className="text-[10px] text-txt-3 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="text-txt-3 hover:text-bad p-1 rounded-md transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-2 hover:bg-border-light text-xs font-medium text-txt transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-accent" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* === MOBILE HEADER === */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-txt-2 cursor-pointer">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-sm font-semibold text-txt">Life Metric</h1>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={logout} className="text-txt-3 hover:text-bad p-1 cursor-pointer" title="Log Out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-2 text-txt hover:bg-border-light cursor-pointer font-medium"
            >
              Sign In
            </button>
          )}
          <span className="text-xs font-medium text-txt-2">{vault.vaultBalance} pts</span>
          <button onClick={toggle} className="text-txt-2 cursor-pointer">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setView('manage')}
            className={`p-1.5 rounded-lg cursor-pointer transition ${
              view === 'manage' ? 'bg-accent text-white' : 'bg-surface-2 text-txt hover:bg-border-light'
            }`}
            title="Manage Tasks & Habits"
          >
            <ListTodo className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile dropdown nav */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-surface px-4 py-2 space-y-1">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  view === item.id ? 'bg-accent/10 text-accent font-medium' : 'text-txt-2'
                } cursor-pointer`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => { setIsRetroModalOpen(true); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-txt-2 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>AI Coaching</span>
          </button>
        </div>
      )}

      {/* === MAIN CONTENT AREA === */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {view === 'dashboard' ? (
            <>
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-txt tracking-tight">Dashboard</h2>
                  <p className="text-xs text-txt-2 mt-0.5">
                    {pendingCount} pending · {completedCount} completed today
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      document.getElementById('habit-matrix-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border-light hover:bg-surface-2 text-txt text-xs font-medium transition cursor-pointer"
                    title="Jump down to Habit Consistency Matrix"
                  >
                    <Grid3X3 className="w-3.5 h-3.5 text-accent" />
                    <span className="hidden sm:inline">Habit Matrix</span>
                  </button>
                  <button
                    onClick={() => setView('manage')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-border-light text-txt text-xs font-medium transition cursor-pointer"
                    title="Open task and habit manager"
                  >
                    <ListTodo className="w-3.5 h-3.5 text-accent" />
                    <span>Manage Tasks</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-surface border border-border-light">
                  <p className="text-[11px] font-medium text-txt-2 uppercase tracking-wider">Vault Balance</p>
                  <p className="text-xl font-semibold text-txt mt-1">{vault.vaultBalance} <span className="text-sm text-txt-2">pts</span></p>
                  <p className="text-[11px] text-txt-3 mt-0.5">{vault.currencyPeg.symbol}{(vault.vaultBalance / vault.currencyPeg.pointsPerUnit).toFixed(0)} pegged</p>
                </div>
                <div className="p-4 rounded-2xl bg-surface border border-border-light">
                  <p className="text-[11px] font-medium text-txt-2 uppercase tracking-wider">Streak Freezes</p>
                  <p className="text-xl font-semibold text-txt mt-1">{vault.streakFreezesCount}</p>
                  <button onClick={handleBuyFreeze} className="text-[11px] text-accent hover:underline cursor-pointer mt-0.5">Buy for {vault.streakFreezeCost} pts</button>
                </div>
                <div className="p-4 rounded-2xl bg-surface border border-border-light">
                  <p className="text-[11px] font-medium text-txt-2 uppercase tracking-wider">Total Earned</p>
                  <p className="text-xl font-semibold text-txt mt-1">{vault.totalPointsEarned} <span className="text-sm text-txt-2">pts</span></p>
                  <p className="text-[11px] text-txt-3 mt-0.5">Lifetime points</p>
                </div>
                <div className="p-4 rounded-2xl bg-surface border border-border-light">
                  <p className="text-[11px] font-medium text-txt-2 uppercase tracking-wider">Badges</p>
                  <p className="text-xl font-semibold text-txt mt-1">{vault.badges.length}</p>
                  <p className="text-[11px] text-txt-3 mt-0.5">Achievements earned</p>
                </div>
              </div>

              {/* Focus Timer */}
              <HybridTimerWidget />

              {/* Eat That Frog Spotlight */}
              {dailyFrog && (
                <div className="p-4 rounded-2xl bg-warn/5 border border-warn/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-warn/10">
                        <Sparkles className="w-4 h-4 text-warn" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-warn uppercase tracking-wider">Today&apos;s Frog · 1.5x before 12 PM</p>
                        <p className="text-sm font-medium text-txt mt-0.5">{dailyFrog.title}</p>
                      </div>
                    </div>
                    {dailyFrog.type === 'DEEP_WORK' && (
                      <button
                        onClick={() => dispatch(startTimer({
                          taskId: String(dailyFrog._id),
                          taskTitle: dailyFrog.title,
                          targetDurationMinutes: dailyFrog.deepWorkDetails?.targetDurationMinutes || 45,
                          openZenMode: true,
                        }))}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Focus</span>
                      </button>
                    )}
                    {(dailyFrog.type === 'HABIT' || dailyFrog.type === 'ADMIN') && (
                      <button
                        onClick={() => setSelectedDetailTaskId(String(dailyFrog._id))}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-2 border border-border-light text-txt text-xs font-medium transition cursor-pointer"
                      >
                        <span>Swipe to Complete →</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Task Section: Two-Tab Layout (Pending vs Completed) */}
              <section className="space-y-3">
                {/* Two-Tab Navigation + Category Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-border-light">
                  {/* Two Main Tabs: Pending vs Completed */}
                  <div className="flex items-center p-1 bg-surface rounded-2xl border border-border-light self-start">
                    <button
                      type="button"
                      onClick={() => setTaskStatusTab('pending')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer ${
                        taskStatusTab === 'pending'
                          ? 'bg-bg text-txt shadow-xs font-semibold'
                          : 'text-txt-2 hover:text-txt font-medium'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5 text-warn" />
                      <span>Pending Tasks</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold transition ${
                          taskStatusTab === 'pending'
                            ? 'bg-warn/15 text-warn'
                            : 'bg-surface-2 text-txt-3'
                        }`}
                      >
                        {categoryPendingCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaskStatusTab('completed')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer ${
                        taskStatusTab === 'completed'
                          ? 'bg-bg text-txt shadow-xs font-semibold'
                          : 'text-txt-2 hover:text-txt font-medium'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                      <span>Completed</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold transition ${
                          taskStatusTab === 'completed'
                            ? 'bg-ok/15 text-ok'
                            : 'bg-surface-2 text-txt-3'
                        }`}
                      >
                        {categoryCompletedCount}
                      </span>
                    </button>
                  </div>

                  {/* Category Pills Filter */}
                  <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border-light self-start md:self-auto">
                    {(['ALL', 'DEEP_WORK', 'HABIT', 'ADMIN'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => dispatch(setSelectedCategory(cat))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          tasks.selectedCategory === cat
                            ? 'bg-bg text-txt shadow-xs font-semibold'
                            : 'text-txt-2 hover:text-txt'
                        }`}
                      >
                        {cat === 'ALL'
                          ? 'All'
                          : cat === 'DEEP_WORK'
                          ? 'Deep Work'
                          : cat === 'HABIT'
                          ? 'Habits'
                          : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-txt-3 px-1">
                  <span>
                    Showing {displayedTasks.length} {taskStatusTab === 'pending' ? 'pending' : 'completed'} items
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="rounded-2xl border border-border-light bg-surface overflow-hidden divide-y divide-border-light">
                  {displayedTasks.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      {tasks.items.length === 0 ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent mx-auto flex items-center justify-center">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-txt">No tasks or habits created yet</p>
                            <p className="text-xs text-txt-3 max-w-sm mx-auto mt-1">
                              Your workspace is clean. Create habits, deep work blocks, and admin tasks in Manage view to start building your streak.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setView('manage')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                            <span>Create Your First Task</span>
                          </button>
                        </>
                      ) : taskStatusTab === 'pending' ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-ok/10 text-ok mx-auto flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-txt">All caught up!</p>
                          <p className="text-xs text-txt-3 max-w-sm mx-auto">
                            No pending tasks for this category. You have crushed your goals!
                          </p>
                          {completedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setTaskStatusTab('completed')}
                              className="mt-2 text-xs text-accent hover:underline cursor-pointer"
                            >
                              View completed tasks ({completedCount}) →
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-surface-2 text-txt-3 mx-auto flex items-center justify-center">
                            <Circle className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-txt">No completed tasks yet</p>
                          <p className="text-xs text-txt-3 max-w-sm mx-auto">
                            Tap any task in the Pending tab and swipe to complete it.
                          </p>
                          <button
                            type="button"
                            onClick={() => setTaskStatusTab('pending')}
                            className="mt-2 text-xs text-accent hover:underline cursor-pointer"
                          >
                            Go to Pending tasks ({pendingCount}) →
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    displayedTasks.map((task) => (
                      <div
                        key={String(task._id)}
                        onClick={() => setSelectedDetailTaskId(String(task._id))}
                        className={`group px-4 py-3.5 transition-all hover:bg-surface-2/60 cursor-pointer flex items-center justify-between gap-3 ${
                          task.completed ? 'opacity-70 bg-surface/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Category Icon Badge */}
                          <div
                            className={`p-2 rounded-xl shrink-0 transition-colors ${
                              task.type === 'HABIT'
                                ? 'bg-warn/10 text-warn group-hover:bg-warn/15'
                                : task.type === 'DEEP_WORK'
                                ? 'bg-accent/10 text-accent group-hover:bg-accent/15'
                                : 'bg-surface-2 text-txt-2'
                            }`}
                          >
                            {task.type === 'HABIT' && <Flame className="w-4 h-4" />}
                            {task.type === 'DEEP_WORK' && <Clock className="w-4 h-4" />}
                            {task.type === 'ADMIN' && <Calendar className="w-4 h-4" />}
                          </div>

                          {/* Content */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  task.completed ? 'line-through text-txt-3' : 'text-txt'
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.isFrog && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> Frog
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-txt-3">
                              {task.type === 'DEEP_WORK' && (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>{task.deepWorkDetails?.targetDurationMinutes}m focus</span>
                                </>
                              )}
                              {task.type === 'HABIT' && (
                                <>
                                  <Flame className="w-3 h-3" />
                                  <span>{task.habitDetails?.streakCount}d streak</span>
                                </>
                              )}
                              {task.type === 'ADMIN' && (
                                <>
                                  <Calendar className="w-3 h-3" />
                                  <span suppressHydrationWarning>
                                    {task.adminDetails
                                      ? new Date(task.adminDetails.dueDate).toLocaleDateString()
                                      : ''}
                                  </span>
                                </>
                              )}
                              {task.type === 'ADMIN' &&
                                task.adminDetails?.subtasks &&
                                task.adminDetails.subtasks.length > 0 && (
                                  <span>
                                    {
                                      task.adminDetails.subtasks.filter((s) => s.completed).length
                                    }
                                    /{task.adminDetails.subtasks.length} subtasks
                                  </span>
                                )}
                              {task.deepWorkDetails?.overtimeBonusAwarded && (
                                <span className="text-ok font-medium">Overtime ✓</span>
                              )}
                              <span>★ {task.importance}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side status / action pill */}
                        <div className="shrink-0 flex items-center gap-2">
                          {task.completed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-ok/10 text-ok border border-ok/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-txt-2 border border-border-light group-hover:border-accent/40 group-hover:text-accent group-hover:bg-accent/5 transition-all">
                              <span>Details &amp; Swipe</span>
                              <ChevronRight className="w-3.5 h-3.5 text-accent" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Habit Matrix & Performance Analytics Section (Embedded directly on Dashboard) */}
              <section id="habit-matrix-section" className="pt-6 border-t border-border-light">
                <HabitMatrixView />
              </section>
            </>
          ) : view === 'manage' ? (
            /* === MANAGE TASKS & HABITS VIEW === */
            <TaskManagerView />
          ) : (
            /* === VAULT VIEW === */
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-txt tracking-tight">The Vault</h2>
                  <p className="text-xs text-txt-2 mt-0.5">
                    Real-world reward pegging · {vault.currencyPeg.symbol}{(100 / vault.currencyPeg.pointsPerUnit).toFixed(0)} per 100 pts
                  </p>
                </div>
                <button
                  onClick={handleBuyFreeze}
                  disabled={vault.vaultBalance < vault.streakFreezeCost}
                  className="px-4 py-2 rounded-xl bg-surface border border-border-light text-sm font-medium text-txt hover:bg-surface-2 disabled:opacity-40 transition cursor-pointer"
                >
                  Buy Streak Freeze · {vault.streakFreezeCost} pts
                </button>
              </div>

              {/* Rewards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vault.rewards.map((reward) => (
                  <div key={String(reward._id)} className={`p-5 rounded-2xl bg-surface border border-border-light flex flex-col justify-between gap-4 ${reward.isRedeemed ? 'opacity-50' : ''}`}>
                    <div>
                      <span className="text-2xl">{reward.icon}</span>
                      <h3 className="text-sm font-semibold text-txt mt-2">{reward.title}</h3>
                      <p className="text-xs text-txt-2 mt-1 line-clamp-2">{reward.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border-light">
                      <div>
                        <span className="text-sm font-semibold text-txt">{reward.pointCost} pts</span>
                        <span className="text-xs text-txt-3 ml-1.5">{vault.currencyPeg.symbol}{reward.monetaryValue}</span>
                      </div>
                      <button
                        onClick={() => handleRedeem(String(reward._id))}
                        disabled={reward.isRedeemed || vault.vaultBalance < reward.pointCost}
                        className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-surface-2 disabled:text-txt-3 text-white text-xs font-medium transition cursor-pointer"
                      >
                        {reward.isRedeemed ? 'Claimed' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {vault.badges.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-txt">Earned Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {vault.badges.map((badge) => (
                      <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-light text-xs">
                        <span className="text-lg">{badge.icon}</span>
                        <div>
                          <p className="font-medium text-txt">{badge.title}</p>
                          <p className="text-[10px] text-txt-3">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Transactions */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-txt">Transaction History</h3>
                <div className="rounded-2xl border border-border-light bg-surface overflow-hidden divide-y divide-border-light max-h-72 overflow-y-auto">
                  {vault.transactions.map((tx) => (
                    <div key={String(tx._id)} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-semibold tabular-nums ${tx.pointsDelta > 0 ? 'text-ok' : 'text-txt-2'}`}>
                          {tx.pointsDelta > 0 ? `+${tx.pointsDelta}` : tx.pointsDelta}
                        </span>
                        <span className="text-txt-2 text-xs">{tx.description}</span>
                      </div>
                      <span className="text-[11px] text-txt-3 tabular-nums">{tx.resultingBalance} pts</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
