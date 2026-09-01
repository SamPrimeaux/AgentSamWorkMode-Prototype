import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Search, Terminal, X, Copy, Check } from 'lucide-react';
import {
  WRANGLER_CATEGORY_LABELS,
  filterWranglerCatalog,
  groupWranglerCatalog,
  type WranglerCatalogEntry,
} from '../../lib/wranglerCommandCatalog';
import {
  GH_CATEGORY_LABELS,
  filterGhCatalog,
  groupGhCatalog,
  type GhCatalogEntry,
} from '../../lib/ghCommandCatalog';
import { filterDeployPaletteRows, type DeployPaletteRow } from '../../lib/deployPaletteItems';
import { cn } from '../../lib/utils';

export type CommandPaletteItem = {
  id: string;
  title: string;
  subtitle: string;
  commandText: string;
  sectionLabel: string;
  risk?: 'low' | 'medium' | 'high';
};

type CfUnifiedCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunCommand?: (command: string) => void;
};

function wrToItem(c: WranglerCatalogEntry): CommandPaletteItem {
  return {
    id: c.id,
    title: c.display_name,
    subtitle: c.mapped_command,
    commandText: c.mapped_command,
    sectionLabel: WRANGLER_CATEGORY_LABELS[c.category],
    risk: c.risk_level,
  };
}

function ghToItem(c: GhCatalogEntry): CommandPaletteItem {
  return {
    id: c.id,
    title: c.display_name,
    subtitle: c.mapped_command,
    commandText: c.mapped_command,
    sectionLabel: `GitHub CLI · ${GH_CATEGORY_LABELS[c.category]}`,
    risk: c.risk_level,
  };
}

function deployToItem(r: DeployPaletteRow): CommandPaletteItem {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    commandText: r.commandText,
    sectionLabel: 'Deploy',
  };
}

function buildSections(term: string): { label: string; items: CommandPaletteItem[] }[] {
  const deploy = filterDeployPaletteRows(term).map(deployToItem);
  const gh = groupGhCatalog(filterGhCatalog(term, 80)).map((g) => ({
    label: `GitHub CLI · ${g.label}`,
    items: g.rows.map(ghToItem),
  }));
  const wr = groupWranglerCatalog(filterWranglerCatalog(term, 80)).map((g) => ({
    label: g.label,
    items: g.rows.map(wrToItem),
  }));

  const sections: { label: string; items: CommandPaletteItem[] }[] = [];
  if (deploy.length) sections.push({ label: 'Deploy', items: deploy });
  sections.push(...gh, ...wr);
  return sections.filter((s) => s.items.length > 0);
}

export const CfUnifiedCommandPalette: React.FC<CfUnifiedCommandPaletteProps> = ({
  open,
  onOpenChange,
  onRunCommand,
}) => {
  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => buildSections(term), [term]);
  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    if (!open) return;
    setTerm('');
    setActiveIndex(0);
    setToast('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const applyItem = useCallback(
    (item: CommandPaletteItem) => {
      void navigator.clipboard?.writeText(item.commandText).catch(() => {});
      onRunCommand?.(item.commandText);
      setToast(`Copied: ${item.commandText}`);
      window.setTimeout(() => close(), 120);
    },
    [close, onRunCommand],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault();
        applyItem(flatItems[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flatItems, activeIndex, applyItem, close]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let runningIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-label="Cloudflare command palette"
        className="w-full max-w-[640px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[min(70vh,560px)]"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <Cloud size={18} className="text-orange-500 shrink-0" />
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Wrangler, D1, R2, gh pr, deploy…  (⌘K)"
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none font-medium"
          />
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            aria-label="Close command palette"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-0">
          {sections.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">No commands match your search.</div>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="mb-2">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-500/90">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const idx = runningIndex++;
                    const selected = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-active={selected ? 'true' : undefined}
                        onClick={() => applyItem(item)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-xl flex flex-col gap-0.5 transition-colors',
                          selected
                            ? 'bg-orange-500/10 border border-orange-500/20'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {item.title}
                          </span>
                          {item.risk === 'high' ? (
                            <span className="text-[9px] uppercase tracking-wide text-red-500 shrink-0">high risk</span>
                          ) : null}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                          {item.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">↑↓</kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">↵</kbd>{' '}
              copy + terminal
            </span>
          </span>
          {toast ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <Check size={12} /> {toast}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy size={11} /> copies shell line
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Global ⌘K / Ctrl+K listener */
export function useCommandPaletteShortcut(onOpen: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onOpen]);
}
