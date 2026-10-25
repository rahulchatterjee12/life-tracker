'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIRetrospectiveReport } from '@/lib/ai/retrospective';
import {
  X,
  RefreshCw,
  Clock,
  Flame,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface RetrospectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RetrospectiveModal({ isOpen, onClose }: RetrospectiveModalProps) {
  const [report, setReport] = useState<AIRetrospectiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRetrospective = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/retrospective', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load AI retrospective:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    fetch('/api/retrospective', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.report) {
          setReport(data.report);
        }
      })
      .catch((err) => {
        console.error('Failed to load AI retrospective:', err);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showLoading = isLoading || (!report && isOpen);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl p-6 sm:p-7 rounded-2xl bg-surface border border-border shadow-2xl text-txt my-8 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-txt">
                Weekly AI Retrospective
              </h3>
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                Gemini Coaching
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <RefreshCw className="w-5 h-5 text-accent animate-spin" />
              <p className="text-xs text-txt-2">
                Analyzing weekly execution logs...
              </p>
            </div>
          ) : report ? (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Executive Summary & Rating */}
              <div className="p-4 rounded-xl bg-bg border border-border-light flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-txt">{report.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-2 font-bold text-txt">
                      Grade: {report.grade}
                    </span>
                  </div>
                  <p className="text-xs text-txt-2 leading-relaxed">
                    {report.executiveSummary}
                  </p>
                </div>
              </div>

              {/* Weekly Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-bg border border-border-light space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-txt-3">
                    <Clock className="w-3 h-3" /> Focus
                  </span>
                  <p className="text-sm font-semibold text-txt font-mono">
                    {report.metricsSnapshot.totalDeepWorkMinutes}m
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg border border-border-light space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-txt-3">
                    <ShieldCheck className="w-3 h-3 text-accent" /> Live Ratio
                  </span>
                  <p className="text-sm font-semibold text-txt font-mono">
                    {report.metricsSnapshot.liveFocusRatioPercentage}%
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg border border-border-light space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-txt-3">
                    <Flame className="w-3 h-3 text-warn" /> Streak
                  </span>
                  <p className="text-sm font-semibold text-txt font-mono">
                    {report.metricsSnapshot.bestActiveStreak}d
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg border border-border-light space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-txt-3">
                    <Sparkles className="w-3 h-3 text-ok" /> Frog %
                  </span>
                  <p className="text-sm font-semibold text-txt font-mono">
                    {report.metricsSnapshot.frogMorningSuccessRate}%
                  </p>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-txt-3">
                  Key Strengths
                </h4>
                <div className="space-y-1">
                  {report.keyStrengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-bg border border-border-light text-xs text-txt flex items-start gap-2"
                    >
                      <span className="text-ok font-semibold">✓</span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friction / Penalties */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-txt-3">
                  Friction &amp; Penalties
                </h4>
                <div className="space-y-1">
                  {report.vulnerabilitiesAndPenalties.map((vuln, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-bg border border-border-light text-xs text-txt flex items-start gap-2"
                    >
                      <span className="text-warn font-semibold">!</span>
                      <span>{vuln}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prescriptions */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-txt-3">
                  Prescriptive Adjustments (Next 7 Days)
                </h4>
                <div className="space-y-1">
                  {report.prescriptiveAdjustments.map((adj, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-bg border border-border-light text-xs text-txt flex items-start gap-2"
                    >
                      <span className="text-accent font-semibold">→</span>
                      <span>{adj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light">
            <span className="text-[10px] text-txt-3">
              Source: {report?.source === 'GEMINI_API' ? 'Gemini 2.5 Flash' : 'System Engine'}
            </span>

            <div className="flex gap-2">
              <button
                onClick={fetchRetrospective}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 hover:bg-border-light text-xs font-medium text-txt transition cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
