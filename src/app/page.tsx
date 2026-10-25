'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  toggleHabitCompletion,
  toggleAdminSubtask,
  toggleAdminTaskCompletion,
  deleteTask,
  setSelectedCategory,
} from '@/lib/features/tasks/tasksSlice';
import { startTimer } from '@/lib/features/timer/timerSlice';
import { purchaseStreakFreeze, redeemVaultReward } from '@/lib/features/vault/vaultSlice';
import ZenMode from '@/components/timer/ZenMode';
import HybridTimerWidget from '@/components/timer/HybridTimerWidget';
import HabitStackModal from '@/components/tasks/HabitStackModal';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import RetrospectiveModal from '@/components/retrospective/RetrospectiveModal';
import { useState } from 'react';
import {
  Flame,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
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
} from 'lucide-react';

type View = 'dashboard' | 'vault';

export default function Home() {
  const { theme, toggle } = useTheme();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.tasks);
  const vault = useAppSelector((state) => state.vault);

  const [view, setView] = useState<View>('dashboard');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);
  const [expandedAdminTaskId, setExpandedAdminTaskId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBuyFreeze = async () => {
    dispatch(purchaseStreakFreeze());
    try {
      await fetch('/api/vault/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BUY' }),
      });
    } catch { /* local state updated */ }
  };

  const handleRedeem = async (rewardId: string) => {
    dispatch(redeemVaultReward(rewardId));
    try {
      await fetch('/api/vault/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
    } catch { /* local state updated */ }
  };

  const filteredTasks = tasks.items.filter((task) => {
    if (tasks.selectedCategory === 'ALL') return true;
    return task.type === tasks.selectedCategory;
  });

  const dailyFrog = tasks.items.find((t) => t.isFrog && !t.completed);
  const pendingCount = tasks.items.filter((t) => !t.completed).length;
  const completedCount = tasks.items.filter((t) => t.completed).length;

  const sidebarNav = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vault' as View, label: 'The Vault', icon: Wallet },
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row bg-bg text-fg">
      {/* Overlays */}
      <ZenMode />
      <HabitStackModal />
      <NewTaskModal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} />
      <RetrospectiveModal isOpen={isRetroModalOpen} onClose={() => setIsRetroModalOpen(false)} />

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
          <span className="text-xs font-medium text-txt-2">{vault.vaultBalance} pts</span>
          <button onClick={toggle} className="text-txt-2 cursor-pointer">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="p-1.5 rounded-lg bg-accent text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
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
                <button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Task</span>
                </button>
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
                    {dailyFrog.type === 'HABIT' && (
                      <button
                        onClick={() => dispatch(toggleHabitCompletion(String(dailyFrog._id)))}
                        className="text-txt-2 hover:text-ok cursor-pointer"
                      >
                        <Circle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Task List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border-light">
                    {(['ALL', 'DEEP_WORK', 'HABIT', 'ADMIN'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => dispatch(setSelectedCategory(cat))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          tasks.selectedCategory === cat
                            ? 'bg-bg text-txt shadow-sm'
                            : 'text-txt-2 hover:text-txt'
                        }`}
                      >
                        {cat === 'ALL' ? 'All' : cat === 'DEEP_WORK' ? 'Deep Work' : cat === 'HABIT' ? 'Habits' : 'Admin'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-txt-3">{filteredTasks.length} items</span>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface overflow-hidden divide-y divide-border-light">
                  {filteredTasks.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-sm text-txt-3">No tasks yet</p>
                      <button
                        onClick={() => setIsNewTaskModalOpen(true)}
                        className="mt-3 text-sm text-accent hover:underline cursor-pointer"
                      >
                        Create your first task
                      </button>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div key={String(task._id)} className={`group px-4 py-3 transition-colors hover:bg-surface-2/50 ${task.completed ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          {/* Action */}
                          {task.type === 'HABIT' && (
                            <button
                              onClick={() => dispatch(toggleHabitCompletion(String(task._id)))}
                              className="shrink-0 text-txt-3 hover:text-ok cursor-pointer"
                            >
                              {task.completed ? <CheckCircle2 className="w-5 h-5 text-ok" /> : <Circle className="w-5 h-5" />}
                            </button>
                          )}
                          {task.type === 'ADMIN' && (
                            <button
                              onClick={() => dispatch(toggleAdminTaskCompletion(String(task._id)))}
                              className="shrink-0 text-txt-3 hover:text-ok cursor-pointer"
                            >
                              {task.completed ? <CheckCircle2 className="w-5 h-5 text-ok" /> : <Circle className="w-5 h-5" />}
                            </button>
                          )}
                          {task.type === 'DEEP_WORK' && (
                            <button
                              disabled={task.completed}
                              onClick={() => dispatch(startTimer({
                                taskId: String(task._id),
                                taskTitle: task.title,
                                targetDurationMinutes: task.deepWorkDetails?.targetDurationMinutes || 45,
                                openZenMode: true,
                              }))}
                              className="shrink-0 w-5 h-5 rounded-full bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center text-[9px] transition cursor-pointer disabled:opacity-30"
                            >
                              ▶
                            </button>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${task.completed ? 'line-through text-txt-3' : 'text-txt'}`}>
                                {task.title}
                              </span>
                              {task.isFrog && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn font-medium">Frog</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-[11px] text-txt-3">
                                {task.type === 'DEEP_WORK' && <><Clock className="w-3 h-3" /> {task.deepWorkDetails?.targetDurationMinutes}m</>}
                                {task.type === 'HABIT' && <><Flame className="w-3 h-3" /> {task.habitDetails?.streakCount}d streak</>}
                                {task.type === 'ADMIN' && <><Calendar className="w-3 h-3" /> {task.adminDetails ? new Date(task.adminDetails.dueDate).toLocaleDateString() : ''}</>}
                              </span>
                              {task.type === 'ADMIN' && task.adminDetails?.subtasks && task.adminDetails.subtasks.length > 0 && (
                                <button
                                  onClick={() => setExpandedAdminTaskId(expandedAdminTaskId === String(task._id) ? null : String(task._id))}
                                  className="flex items-center gap-0.5 text-[11px] text-accent cursor-pointer"
                                >
                                  {task.adminDetails.subtasks.filter((s) => s.completed).length}/{task.adminDetails.subtasks.length} subtasks
                                  {expandedAdminTaskId === String(task._id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                              {task.deepWorkDetails?.overtimeBonusAwarded && (
                                <span className="text-[11px] text-ok font-medium">Overtime ✓</span>
                              )}
                              <span className="text-[11px] text-txt-3">★ {task.importance}</span>
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => dispatch(deleteTask(String(task._id)))}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-txt-3 hover:text-bad p-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtasks */}
                        {task.type === 'ADMIN' && expandedAdminTaskId === String(task._id) && task.adminDetails?.subtasks && (
                          <div className="ml-8 mt-2 space-y-1 pt-2 border-t border-border-light">
                            {task.adminDetails.subtasks.map((sub) => (
                              <label key={sub.id} className="flex items-center gap-2 text-xs text-txt-2 cursor-pointer select-none hover:text-txt">
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={() => dispatch(toggleAdminSubtask({ taskId: String(task._id), subtaskId: sub.id }))}
                                  className="h-3.5 w-3.5 rounded border-border accent-accent"
                                />
                                <span className={sub.completed ? 'line-through text-txt-3' : ''}>{sub.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
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
