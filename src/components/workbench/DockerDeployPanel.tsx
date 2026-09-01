import React, { useMemo, useState } from 'react';
import { Container, Hammer, FileCode2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DockerAppType, DOCKER_APP_TYPE_LABELS } from '../../lib/dockerfileTemplates';
import { buildDockerDeployPlan } from '../../lib/dockerFileOps';
import { useTerminalBridge } from '../../hooks/useTerminalBridge';
import { cn } from '../../lib/utils';

interface DockerDeployPanelProps {
  /** Used as image/container/compose-service name. */
  appSlug: string;
  defaultAppType?: DockerAppType;
  defaultPort?: number;
  className?: string;
}

type PlanStatus = 'idle' | 'running' | 'done' | 'error';

/**
 * Self-contained "build & run this locally via Docker" panel.
 * Not coupled to ClientWebsiteData — works for any app/artifact/idea, hence a
 * standalone component rather than logic baked into DeploymentModal.
 * Generates Dockerfile/.dockerignore/docker-compose.yml, writes them via the
 * existing shell exec bridge (heredoc), then builds and runs ephemeral (--rm,
 * capped resources) — no idle containers, no metered hosting.
 */
export const DockerDeployPanel: React.FC<DockerDeployPanelProps> = ({
  appSlug,
  defaultAppType = 'static',
  defaultPort,
  className,
}) => {
  const [appType, setAppType] = useState<DockerAppType>(defaultAppType);
  const [port, setPort] = useState<number | undefined>(defaultPort);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<PlanStatus>('idle');

  const { execCommand } = useTerminalBridge({
    targetType: 'local',
    onOutputLine: (line) => setLog((l) => [...l, line]),
  });

  const plan = useMemo(() => buildDockerDeployPlan(appType, { appSlug, port }), [appType, appSlug, port]);

  const runPlan = async () => {
    setStatus('running');
    setLog([]);
    try {
      for (const w of plan.writeCommands) {
        const res = await execCommand(w.command);
        if (!res.ok) {
          setStatus('error');
          return;
        }
      }
      const buildRes = await execCommand(plan.buildCommand);
      if (!buildRes.ok) {
        setStatus('error');
        return;
      }
      const runRes = await execCommand(plan.runCommand);
      if (!runRes.ok) {
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
        <Container size={16} className="text-blue-400" />
        <span>Docker (local) — offline prototyping, no metered hosting</span>
      </div>

      {/* App type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(DOCKER_APP_TYPE_LABELS) as DockerAppType[]).map((t) => {
          const meta = DOCKER_APP_TYPE_LABELS[t];
          const isSelected = t === appType;
          return (
            <button
              key={t}
              onClick={() => setAppType(t)}
              className={cn(
                'p-2.5 rounded-xl border text-left text-xs transition-all',
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700',
              )}
            >
              <div className="font-semibold">{meta.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{meta.sublabel}</div>
            </button>
          );
        })}
      </div>

      {/* Host port */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <label className="font-medium">Host port</label>
        <input
          type="number"
          value={port ?? plan.hostPort}
          onChange={(e) => setPort(Number(e.target.value) || undefined)}
          className="w-24 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono"
        />
      </div>

      {/* Dockerfile preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          <FileCode2 size={12} />
          <span>Generated Dockerfile</span>
        </div>
        <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
          {plan.files.dockerfile}
        </pre>
      </div>

      {/* Action */}
      <button
        onClick={runPlan}
        disabled={status === 'running'}
        className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
      >
        {status === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Hammer size={16} />}
        <span>{status === 'running' ? 'Writing files, building, running…' : 'Write files, build & run (--rm)'}</span>
      </button>

      {status === 'done' && (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 size={14} />
          <span>Running at http://localhost:{plan.hostPort} — container destroys itself on stop (--rm)</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
          <AlertTriangle size={14} />
          <span>Something failed — check the log below. Confirm Docker Desktop is running on the target lane.</span>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 font-mono text-[11px] text-zinc-400 max-h-40 overflow-y-auto whitespace-pre-wrap">
          {log.join('\n')}
        </div>
      )}
    </div>
  );
};
