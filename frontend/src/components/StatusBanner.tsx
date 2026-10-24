import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { checkBackendHealth } from '../services/api';
import { HealthStatus } from '../types';

export const StatusBanner: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Cannot reach backend server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 30 seconds for live connectivity
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-800/40 border border-slate-800 rounded-lg p-3 my-4 flex items-center justify-between flex-wrap gap-2 text-xs">
      <div className="flex items-center space-x-2">
        <Activity className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 font-medium">FastAPI Backend Status:</span>
        {loading ? (
          <span className="flex items-center space-x-1.5 text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Checking health endpoint...</span>
          </span>
        ) : health ? (
          <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Connected ({health.service} v{health.version} - {health.environment})</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1.5 text-amber-400 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Disconnected ({error})</span>
          </span>
        )}
      </div>

      <button
        onClick={fetchHealth}
        className="px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition border border-slate-700 flex items-center space-x-1"
        title="Refresh health status"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        <span>Ping</span>
      </button>
    </div>
  );
};
