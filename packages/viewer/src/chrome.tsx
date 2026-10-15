// The bar along the top, and the page of every canvas when none is open.

import { useEffect, useState } from 'react';
import type { Theme } from '@atelier/themes';
import { Badge, Code, Panel, Stack, Text } from '../../kit/src/index.ts';
import { ago, cx } from '../../kit/src/util.ts';
import { projectName } from './overlays.tsx';
import type { CanvasInfo, Run, Session } from './types.ts';

export type Link = 'connecting' | 'live' | 'lost' | 'signed-out';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Bar(props: {
  workspaces: CanvasInfo[];
  current: CanvasInfo | null;
  project: string | null;
  sessions: Session[];
  runs: Run[];
  theme: Theme;
  link: Link;
  onPick: (id: string | null) => void;
  onOpen: (overlay: 'themes' | 'find' | 'help' | 'runs') => void;
}) {
  const now = useClock();
  const here = props.sessions.filter((s) => s.status !== 'ended' && (!props.project || s.project === props.project));
  const working = here.filter((s) => s.status === 'working').length;
  const waiting = here.filter((s) => s.status === 'waiting').length;
  const idle = here.filter((s) => s.status === 'idle').length;
  const running = props.runs.filter((r) => r.status === 'running').length;
  const c = props.theme.colors;
  return (
    <header className="av-bar">
      <div className="av-bar-left">
        <button type="button" className="av-module av-project" title="Every canvas (0)" onClick={() => props.onPick(null)}>
          {props.project ? projectName(props.project) : 'atelier'}
        </button>
        {props.workspaces.length > 0 && (
          <nav className="av-workspaces" aria-label="Canvases">
            {props.workspaces.map((w, i) => (
              <button
                type="button"
                key={w.id}
                className={cx('av-ws', w.id === props.current?.id && 'av-on')}
                title={`${w.title} (${i < 9 ? i + 1 : ''})`}
                onClick={() => props.onPick(w.id)}
              >
                <span>{i < 9 ? i + 1 : '·'}</span>
                <span className="av-ws-name">{w.title}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      <button type="button" className="av-module av-clock" title={now.toDateString()} onClick={() => props.onOpen('find')}>
        {now.toLocaleDateString(undefined, { weekday: 'short' })} {pad(now.getHours())}:{pad(now.getMinutes())}
      </button>
      <div className="av-bar-right">
        {props.link !== 'live' && (
          <span className={cx('av-module', 'at-toned', props.link === 'connecting' ? 'at-t-muted' : 'at-t-danger')}>
            {props.link === 'connecting' ? 'connecting' : props.link === 'lost' ? 'daemon offline' : 'signed out'}
          </span>
        )}
        <span
          className="av-module av-agents"
          title={here.map((s) => `${s.status}: ${s.title ?? s.id}`).join('\n') || 'No Claude Code sessions here'}
        >
          {here.length === 0 && <span className="at-text-3">no agents</span>}
          {working > 0 && (
            <span className="at-t-info">
              <b>●</b> {working} working
            </span>
          )}
          {waiting > 0 && (
            <span className="at-t-warning">
              <b>▲</b> {waiting} waiting
            </span>
          )}
          {idle > 0 && (
            <span className="at-t-muted">
              <b>○</b> {idle} idle
            </span>
          )}
        </span>
        <button type="button" className="av-module" title="Background runs (r)" onClick={() => props.onOpen('runs')}>
          <span className={cx('av-dot', running ? 'at-t-info' : 'at-t-muted')} /> {running ? `${running} running` : 'runs'}
        </button>
        <button type="button" className="av-module" title="Pick a theme (t)" onClick={() => props.onOpen('themes')}>
          <span className="av-swatch" aria-hidden>
            {[c.accent, c.success, c.warning, c.danger].map((colour, i) => (
              <i key={i} style={{ background: colour }} />
            ))}
          </span>
          {props.theme.name}
        </button>
        <button type="button" className="av-module" title="Keys (?)" onClick={() => props.onOpen('help')}>
          ?
        </button>
      </div>
    </header>
  );
}

/** Every canvas, by project, newest project first. */
export function Home({ canvases, sessions, onPick }: { canvases: CanvasInfo[]; sessions: Session[]; onPick: (id: string) => void }) {
  const now = Date.now();
  const projects = new Map<string, CanvasInfo[]>();
  for (const c of [...canvases].sort((a, b) => b.modified - a.modified)) {
    if (!projects.has(c.project)) projects.set(c.project, []);
    projects.get(c.project)!.push(c);
  }
  if (!canvases.length) {
    return (
      <div className="av-page">
        <Stack gap={14}>
          <Panel title="No canvases yet" tone="accent">
            <Stack gap={8}>
              <Text>Ask Claude Code for a canvas in any project, and it shows up here as soon as it's written.</Text>
              <Text tone="secondary">
                Or start one from a template: <Code>atelier new workstream plan</Code>, then <Code>atelier open .atelier/plan.canvas.json</Code>.
              </Text>
              <Text tone="muted" size="sm">
                Canvases live in each project's <Code>.atelier</Code> folder. Press <Code>?</Code> for the keys.
              </Text>
            </Stack>
          </Panel>
        </Stack>
      </div>
    );
  }
  return (
    <div className="av-page">
      <Stack gap={14}>
        {[...projects].map(([project, list]) => {
          const agents = sessions.filter((s) => s.project === project && s.status !== 'ended');
          return (
            <Panel key={project} title={projectName(project)} info={`${list.length} canvas${list.length === 1 ? '' : 'es'}${agents.length ? ` · ${agents.length} agent${agents.length === 1 ? '' : 's'}` : ''}`}>
              <ul className="av-list">
                {list.map((c) => (
                  <li key={c.id} className="av-item" onClick={() => onPick(c.id)}>
                    <span>
                      <b>{c.title}</b> <span className="av-sub">{c.name}</span>
                    </span>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Badge tone={c.kind === 'template' ? 'accent' : 'default'}>{c.template ?? 'custom'}</Badge>
                      <span className="av-sub">{ago(c.modified, now)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </Stack>
    </div>
  );
}
