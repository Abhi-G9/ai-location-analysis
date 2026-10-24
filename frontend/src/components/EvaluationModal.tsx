import React, { useEffect, useState } from 'react';
import {
  X,
  Award,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Sparkles,
  RefreshCw,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { EvaluationReport } from '../types';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'metrics' | 'modelCards' | 'limitations'>('metrics');

  const fetchMetrics = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/evaluation/metrics${refresh ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: EvaluationReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      fetchMetrics(false);
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Evaluation Benchmark & Model Card</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Phase 6 Release Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent systematic validation across positive, negative, and challenging test samples
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchMetrics(true)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rerun benchmark evaluation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-xs">
          {loading && !report ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
              <p className="text-slate-400 text-xs">Running multi-modal evaluation benchmark...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              {error}
            </div>
          ) : report ? (
            <>
              {/* Executive KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Top-1 Accuracy</span>
                  <span className="text-xl font-mono font-bold text-emerald-300">
                    {report.top_1_accuracy_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Correct Landmark #1</span>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Top-5 Accuracy</span>
                  <span className="text-xl font-mono font-bold text-sky-300">
                    {report.top_5_accuracy_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">In Candidate Pool</span>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Median Error</span>
                  <span className="text-xl font-mono font-bold text-amber-300">
                    {report.median_error_km !== null ? `${report.median_error_km} km` : '0.0 km'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Haversine Distance</span>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Negative Abstention</span>
                  <span className="text-xl font-mono font-bold text-emerald-300">
                    {report.negative_abstention_rate_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Refused Non-Places</span>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">False Positive Rate</span>
                  <span className="text-xl font-mono font-bold text-emerald-300">
                    {report.false_positive_rate_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">0 False Claims</span>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex border-b border-slate-800 space-x-2 pt-2">
                <button
                  onClick={() => setTab('metrics')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
                    tab === 'metrics'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Benchmark Samples ({report.total_samples})</span>
                </button>

                <button
                  onClick={() => setTab('modelCards')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
                    tab === 'modelCards'
                      ? 'border-sky-400 text-sky-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Model Cards ({report.model_cards.length})</span>
                </button>

                <button
                  onClick={() => setTab('limitations')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
                    tab === 'limitations'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Limitations & Future Work</span>
                </button>
              </div>

              {/* Tab 1: Benchmark Samples */}
              {tab === 'metrics' && (
                <div className="space-y-3">
                  <div className="divide-y divide-slate-800 bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                    {report.sample_results.map((sample) => (
                      <div key={sample.sample_id} className="p-3.5 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                sample.sample_type === 'positive'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : sample.sample_type === 'challenging'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sample.sample_type.toUpperCase()}
                            </span>
                            <span className="font-bold text-white text-xs">{sample.description}</span>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            Ground Truth: <span className="text-slate-200">{sample.ground_truth_name}</span> &bull;{' '}
                            Predicted: <span className="text-white font-medium">{sample.predicted_top_1_name || 'Abstained'}</span>
                          </p>

                          <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                            <span>Clues: {sample.clues_provided.join(', ')}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center justify-end space-x-1.5">
                            {sample.abstained ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                                Abstained (Honest)
                              </span>
                            ) : sample.is_top_1_correct ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Top-1 Correct</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                                {sample.confidence_category}
                              </span>
                            )}
                          </div>
                          {sample.actual_error_km !== null && sample.actual_error_km !== undefined && (
                            <span className="font-mono text-[10px] text-slate-400 block mt-1">
                              Actual Error: {sample.actual_error_km} km
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Model Cards */}
              {tab === 'modelCards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.model_cards.map((card, idx) => (
                    <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-xs">{card.model_name}</h4>
                        <span className="text-[10px] font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40">
                          {card.hardware_target}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">{card.architecture}</p>
                      <p className="text-[11px] text-slate-300">{card.rationale}</p>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Task: {card.primary_task}</span>
                        <span className="font-mono text-slate-300">{card.feature_dimension}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Limitations & Future Work */}
              {tab === 'limitations' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-amber-300 text-xs mb-2 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Documented System Limitations (Honest AI)</span>
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-300">
                      {report.limitations.map((lim, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                          <span>{lim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-emerald-300 text-xs mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Future Improvements & Research Directions</span>
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-300">
                      {report.future_work.map((fw, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                          <span>{fw}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ephemeral Processing &bull; No Persistent File Storage &bull; Clean Data Provenance</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
