import { Component, type ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Ctx, save, type Screen, type AppCtx } from './store';
import type { Settings } from '../engine/SaveEngine';
import { setAudio } from './sound';
import { Home } from './screens/Home';
import { TeamBuilder } from './screens/TeamBuilder';
import { Opponent } from './screens/Opponent';
import { Preview } from './screens/Preview';
import { LiveMatch } from './screens/LiveMatch';
import { Results } from './screens/Results';
import { DreamTeams } from './screens/DreamTeams';
import { TournamentScreen } from './screens/Tournament';
import { PlayerDB } from './screens/PlayerDB';
import { History } from './screens/History';
import { SettingsScreen } from './screens/Settings';
import { WatchMode } from './screens/Watch';
import { Challenge } from './screens/Challenge';

class ErrorBoundary extends Component<{ children: ComponentChildren; onHome: () => void; resetKey: unknown }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.warn('[HSVL] UI error:', err); }
  componentDidUpdate(prev: { resetKey: unknown }) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div class="screen" data-testid="error-boundary">
        <h1>Something went wrong</h1>
        <p><code>{String(this.state.err.message || this.state.err)}</code></p>
        <button class="btn primary" onClick={() => { this.setState({ err: null }); this.props.onHome(); }}>Return Home</button>
      </div>
    );
  }
}

export function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [settings, setSettingsState] = useState<Settings>(() => save.getSettings());
  const [toastMsg, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const cur = stack[stack.length - 1];

  useEffect(() => { setAudio(settings.volume, settings.muted); }, [settings]);

  useEffect(() => {
    history.replaceState({ depth: 0 }, '');
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useCallback((s: Screen, replace = false) => {
    setStack((st) => {
      if (replace) return [...st.slice(0, -1), s];
      history.pushState({ depth: st.length }, '');
      return [...st, s];
    });
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => { setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)); window.scrollTo(0, 0); }, []);
  const home = useCallback(() => { setStack([{ name: 'home' }]); window.scrollTo(0, 0); }, []);
  const root = useCallback((s: Screen) => { setStack([{ name: 'home' }, s]); window.scrollTo(0, 0); }, []);
  const setSettings = useCallback((s: Settings) => { save.saveSettings(s); setSettingsState(s); }, []);
  const toast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const appCtx: AppCtx = { nav, back, home, root, settings, setSettings, toast };

  let body: ComponentChildren = null;
  switch (cur.name) {
    case 'home': body = <Home />; break;
    case 'builder': body = <TeamBuilder mode={cur.mode} schoolId={cur.schoolId} />; break;
    case 'opponent': body = <Opponent team={cur.team} mode={cur.mode} />; break;
    case 'preview': body = <Preview team={cur.team} opponent={cur.opponent} mode={cur.mode} seed={cur.seed} />; break;
    case 'live': body = <LiveMatch team={cur.team} opponent={cur.opponent} mode={cur.mode} seed={cur.seed} />; break;
    case 'results': body = <Results result={cur.result} team={cur.team} opponent={cur.opponent} mode={cur.mode} seed={cur.seed} />; break;
    case 'dreams': body = <DreamTeams />; break;
    case 'tournament': body = <TournamentScreen />; break;
    case 'players': body = <PlayerDB />; break;
    case 'history': body = <History />; break;
    case 'settings': body = <SettingsScreen />; break;
    case 'watch': body = <WatchMode />; break;
    case 'challenge': body = <Challenge />; break;
  }

  return (
    <Ctx.Provider value={appCtx}>
      <div class="app-shell">
        <ErrorBoundary onHome={home} resetKey={cur.name}>{body}</ErrorBoundary>
        {toastMsg && <div class="toast" data-testid="toast">{toastMsg}</div>}
      </div>
    </Ctx.Provider>
  );
}
