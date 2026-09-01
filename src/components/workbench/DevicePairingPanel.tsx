import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Laptop,
  Loader2,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPairingCode } from '../../lib/terminal/pairingApi';
import type { PairingStatus } from '../../lib/terminal/pairingTypes';

type DevicePairingPanelProps = {
  code: string | null;
  cliCommand: string | null;
  status: PairingStatus | 'idle';
  expiresAt: number | null;
  deviceName: string | null;
  platform: string | null;
  loading?: boolean;
  error?: string | null;
  onStart: () => void;
  onCancel: () => void;
  onRefresh?: () => void;
};

function formatCountdown(expiresAt: number | null): string {
  if (!expiresAt) return '';
  const sec = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const STATUS_COPY: Record<PairingStatus | 'idle', { label: string; tone: string }> = {
  idle: { label: 'Not started', tone: 'text-white/50' },
  pending: { label: 'Waiting for CLI', tone: 'text-amber-300' },
  claimed: { label: 'Device claimed — starting bridge', tone: 'text-blue-300' },
  connected: { label: 'Connected', tone: 'text-emerald-300' },
  expired: { label: 'Code expired', tone: 'text-rose-300' },
  cancelled: { label: 'Cancelled', tone: 'text-white/40' },
};

export const DevicePairingPanel: React.FC<DevicePairingPanelProps> = ({
  code,
  cliCommand,
  status,
  expiresAt,
  deviceName,
  platform,
  loading,
  error,
  onStart,
  onCancel,
  onRefresh,
}) => {
  const [copied, setCopied] = useState<'code' | 'cli' | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!expiresAt || status !== 'pending') return;
    const tick = () => setCountdown(formatCountdown(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, status]);

  const copy = async (text: string, kind: 'code' | 'cli') => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusMeta = STATUS_COPY[status];

  if (status === 'idle' || status === 'expired' || status === 'cancelled') {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
            <Laptop size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Connect your machine</h4>
            <p className="text-xs text-white/55 leading-relaxed">
              Pair localhost, Docker, or your Cloudflare tunnel. No manual env copy — enter a one-time code in the CLI.
            </p>
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={onStart}
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Terminal size={16} />}
          <span>{loading ? 'Generating code…' : 'Generate pairing code'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
            Pairing code
          </div>
          <div className={cn('text-3xl font-mono font-bold tracking-[0.2em] text-white mt-1')}>
            {code ? formatPairingCode(code) : '----'}
          </div>
        </div>
        <div className="text-right">
          <div className={cn('text-xs font-semibold', statusMeta.tone)}>{statusMeta.label}</div>
          {status === 'pending' && countdown && (
            <div className="text-[11px] text-white/40 font-mono mt-0.5">expires {countdown}</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
          Run on your machine
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-black/50 border border-white/10 px-3 py-2.5">
          <code className="flex-1 text-xs font-mono text-emerald-200 break-all">
            {cliCommand || `npx agentsam-bridge pair ${code || ''}`}
          </code>
          <button
            type="button"
            onClick={() => void copy(cliCommand || '', 'cli')}
            className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70"
            title="Copy CLI command"
          >
            {copied === 'cli' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {(deviceName || platform) && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Laptop size={13} className="text-emerald-400" />
          <span>
            {deviceName}
            {platform ? ` · ${platform}` : ''}
          </span>
        </div>
      )}

      {status === 'connected' && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check size={14} />
          <span>Your machine is live. Work Mode will use <strong>user_hosted_tunnel</strong> by default.</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} />
            Refresh status
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium flex items-center gap-1.5"
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
};
