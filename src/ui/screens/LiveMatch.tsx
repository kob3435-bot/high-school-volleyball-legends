import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { Ctx } from '../store';
import { MatchSim } from '../../engine/Match';
import type { TeamConfig } from '../../engine/types';
import { CourtView } from '../render/CourtView';
import { sfxForEvent } from '../sound';
import { OFF_TACTICS, DEF_TACTICS } from '../../engine/types';
import { setTactics } from '../../engine/TacticalEngine';
import { getPlayer } from '../../engine/db';
import { t } from '../i18n/strings';

export function LiveMatch({ team, opponent, mode, seed }: {
  team: TeamConfig; opponent: TeamConfig; mode: string; seed: number;
}) {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<MatchSim | null>(null);
  const viewRef = useRef<CourtView | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(ctx.settings.gameSpeed);
  const [commentary, setCommentary] = useState('…');
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [sets, setSets] = useState<[number, number]>([0, 0]);
  const [setNo, setSetNo] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [serving, setServing] = useState(0);
  const [subOpen, setSubOpen] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);
  const [subIn, setSubIn] = useState<string | null>(null);
  const [huddleUI, setHuddleUI] = useState(false);
  const [rotation, setRotation] = useState<string[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const accum = useRef(0);
  const playedIdx = useRef(0);
  const last = useRef(0);
  const pausedRef = useRef(false);
  const speedRef = useRef(speed);
  pausedRef.current = paused;
  speedRef.current = speed;

  useEffect(() => {
    const sim = new MatchSim(team, opponent, seed, {
      userTeam: 0, bestOf: ctx.settings.bestOf, keepEvents: true, mode,
    });
    simRef.current = sim;
    const view = new CourtView(
      [sim.st.teams[0].rotation.slice(), sim.st.teams[1].rotation.slice()],
      [[team.primary, team.secondary], [opponent.primary, opponent.secondary]],
      [team.short, opponent.short],
    );
    view.graphics = ctx.settings.graphics === 'auto' ? 'high' : ctx.settings.graphics;
    view.showLabels = true;
    view.replayMode = ctx.settings.replay;
    viewRef.current = view;
    (window as unknown as { __hsvlView?: CourtView }).__hsvlView = view;
    setRotation(sim.st.teams[0].rotation.slice());
    setBench(sim.st.teams[0].bench.slice());

    const canvas = canvasRef.current!;
    const ctx2 = canvas.getContext('2d')!;
    let raf = 0;
    last.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const v = viewRef.current!;
      const s = simRef.current!;

      // Advance sim only when the view finished the previous rally (full point playback)
      if (!pausedRef.current && !s.finished && !v.replay && !v.holdFrozen && v.isIdle()) {
        accum.current += dt * speedRef.current;
        // Pace between rallies scales mildly with speed; contacts are paced inside CourtView
        const interval = 0.35 / Math.max(1, speedRef.current * 0.85);
        if (accum.current >= interval) {
          accum.current = 0;
          const evs = s.step();
          v.setLineups([s.st.teams[0].rotation.slice(), s.st.teams[1].rotation.slice()]);
          v.serving = s.st.serving;
          v.apply(evs);
          for (const e of evs) {
            if (e.type === 'timeout') { setHuddleUI(true); setPaused(true); }
          }
          setScore([s.st.teams[0].score, s.st.teams[1].score]);
          setSets([...s.st.setsWon] as [number, number]);
          setSetNo(s.st.setNumber);
          setServing(s.st.serving);
          setRotation(s.st.teams[0].rotation.slice());
          setBench(s.st.teams[0].bench.slice());
        }
      }
      // Commentary + SFX follow events as they are visually presented
      if (v.playedLog.length > playedIdx.current) {
        for (let i = playedIdx.current; i < v.playedLog.length; i++) {
          const pe = v.playedLog[i];
          sfxForEvent(pe.type as Parameters<typeof sfxForEvent>[0], 0);
        }
        playedIdx.current = v.playedLog.length;
        if (v.lastEvent) setCommentary(v.lastEvent);
      }

      const parent = canvas.parentElement!;
      const w = parent.clientWidth, h = parent.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      v.update(dt);
      v.draw(ctx2, w, h);

      if (s.finished && !v.replay) {
        const result = s.getResult();
        setTimeout(() => ctx.nav({ name: 'results', result, team, opponent, mode, seed }, true), 700);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const skipRally = () => {
    const s = simRef.current, v = viewRef.current;
    if (!s || s.finished) return;
    // Finish current visual rally instantly, then sim next point under the hood
    if (v && !v.isIdle()) {
      v.applyInstant([]);
    }
    const evs = s.step();
    v?.applyInstant(evs);
    playedIdx.current = v?.playedLog.length ?? 0;
    setScore([s.st.teams[0].score, s.st.teams[1].score]);
    setSets([...s.st.setsWon] as [number, number]);
    setRotation(s.st.teams[0].rotation.slice());
    setBench(s.st.teams[0].bench.slice());
    for (const e of evs) if (e.text) setCommentary(e.text);
  };
  const skipSet = () => {
    const s = simRef.current;
    const v = viewRef.current;
    if (!s || s.finished) return;
    v?.applyInstant([]);
    s.skipSet();
    setScore([s.st.teams[0].score, s.st.teams[1].score]);
    setSets([...s.st.setsWon] as [number, number]);
    setSetNo(s.st.setNumber);
    setCommentary('Set skipped');
    if (s.finished) ctx.nav({ name: 'results', result: s.getResult(), team, opponent, mode, seed }, true);
  };

  const doTimeout = () => {
    simRef.current?.requestTimeout(0);
    viewRef.current?.showHuddle(true);
    setHuddleUI(true);
    setPaused(true);
    setPanelOpen(true);
  };

  const closeHuddle = () => {
    viewRef.current?.showHuddle(false);
    setHuddleUI(false);
    setPaused(false);
  };

  const confirmSub = () => {
    if (!subOut || !subIn || !simRef.current) return;
    const ok = simRef.current.substitute(0, subOut, subIn);
    if (ok) {
      setRotation(simRef.current.st.teams[0].rotation.slice());
      setBench(simRef.current.st.teams[0].bench.slice());
      viewRef.current?.setLineups([
        simRef.current.st.teams[0].rotation.slice(),
        simRef.current.st.teams[1].rotation.slice(),
      ]);
      ctx.toast(`${getPlayer(subIn)?.name} ${t(lang, 'subIn')}`);
    } else {
      ctx.toast('Illegal substitution');
    }
    setSubOpen(false); setSubOut(null); setSubIn(null);
  };

  const awayColor = contrastText(opponent.secondary, opponent.primary);
  const homeColor = contrastText(team.secondary, team.primary);

  return (
    <div class="live-wrap" data-testid="live-match">
      <div class="live-top">
        <div class="live-bar">
          <div class="scoreboard">
            <div class="team" style={{ color: homeColor, fontWeight: 800 }}>{team.short}</div>
            <div class="sets">{[0, 1, 2].map((i) => <div key={i} class={`set-pip ${sets[0] > i ? 'on' : ''}`} />)}</div>
            <div class="pts" data-testid="score">{score[0]} – {score[1]}</div>
            <div class="sets">{[0, 1, 2].map((i) => <div key={i} class={`set-pip ${sets[1] > i ? 'on' : ''}`} />)}</div>
            <div class="team right" style={{ color: awayColor, fontWeight: 800 }}>{opponent.short}</div>
          </div>
          <div class="live-controls">
            <button class="btn sm" data-testid="btn-pause" onClick={() => setPaused((p) => !p)}>{paused ? t(lang, 'resume') : t(lang, 'pause')}</button>
            {[1, 2, 4].map((sp) => (
              <button key={sp} class={`btn sm ${speed === sp ? 'primary' : ''}`} data-testid={`speed-${sp}`}
                onClick={() => setSpeed(sp as 1 | 2 | 4)}>{sp}x</button>
            ))}
            <div class="live-controls-extra">
              <button class="btn sm" data-testid="btn-skip-rally" onClick={skipRally}>{t(lang, 'skipRally')}</button>
              <button class="btn sm" data-testid="btn-skip-set" onClick={skipSet}>{t(lang, 'skipSet')}</button>
              <button class="btn sm" data-testid="btn-tactics" onClick={() => setPanelOpen((o) => !o)}>{t(lang, 'tactics')}</button>
              <button class="btn sm" data-testid="btn-labels" onClick={() => {
                const v = viewRef.current; if (!v) return;
                // cycle smart -> all -> off
                if (v.labelMode === 'smart') { v.labelMode = 'all'; v.showLabels = true; }
                else if (v.labelMode === 'all') { v.labelMode = 'off'; v.showLabels = false; }
                else { v.labelMode = 'smart'; v.showLabels = true; }
              }}>{t(lang, 'nameLabels')}</button>
              <button class="btn sm" data-testid="btn-timeout" onClick={doTimeout}>{t(lang, 'timeout')}</button>
              <button class="btn sm" data-testid="btn-sub" onClick={() => { setSubOpen(true); setPaused(true); }}>{t(lang, 'sub')}</button>
            </div>
            <button class="btn sm primary live-menu-btn" data-testid="btn-menu" onClick={() => setMenuOpen((o) => !o)}>{t(lang, 'menu')}</button>
          </div>
        </div>
        <div class="muted live-setline">Set {setNo} · Serve: {serving === 0 ? team.short : opponent.short}</div>
      </div>
      {menuOpen && (
        <div class="live-menu-sheet" data-testid="live-menu">
          <button class="btn sm" data-testid="btn-skip-rally" onClick={() => { skipRally(); setMenuOpen(false); }}>{t(lang, 'skipRally')}</button>
          <button class="btn sm" data-testid="btn-skip-set" onClick={() => { skipSet(); setMenuOpen(false); }}>{t(lang, 'skipSet')}</button>
          <button class="btn sm" data-testid="btn-tactics" onClick={() => { setPanelOpen(true); setMenuOpen(false); }}>{t(lang, 'tactics')}</button>
          <button class="btn sm" data-testid="btn-labels" onClick={() => {
            const v = viewRef.current; if (!v) return;
            if (v.labelMode === 'smart') { v.labelMode = 'all'; v.showLabels = true; }
            else if (v.labelMode === 'all') { v.labelMode = 'off'; v.showLabels = false; }
            else { v.labelMode = 'smart'; v.showLabels = true; }
            setMenuOpen(false);
          }}>{t(lang, 'nameLabels')}</button>
          <button class="btn sm" data-testid="btn-timeout" onClick={() => { doTimeout(); setMenuOpen(false); }}>{t(lang, 'timeout')}</button>
          <button class="btn sm" data-testid="btn-sub" onClick={() => { setSubOpen(true); setPaused(true); setMenuOpen(false); }}>{t(lang, 'sub')}</button>
          <button class="btn sm" onClick={() => setMenuOpen(false)}>{t(lang, 'cancel')}</button>
        </div>
      )}
      <div class="court-stage">
        <canvas ref={canvasRef} data-testid="court-canvas" />
      </div>
      <div class="live-bottom">
        <div class="commentary" data-testid="commentary">{commentary}</div>
        <div class={`tactical-panel ${panelOpen ? 'open' : ''}`} data-testid="tactical-panel">
          <div>
            <div class="muted">{t(lang, 'offense')}</div>
            {OFF_TACTICS.map((tac) => (
              <button key={tac} class="btn sm" style={{ margin: 2 }} onClick={() => {
                const s = simRef.current; if (s) setTactics(s.st.teams[0], { offense: tac });
              }}>{tac}</button>
            ))}
          </div>
          <div>
            <div class="muted">{t(lang, 'defense')}</div>
            {DEF_TACTICS.map((tac) => (
              <button key={tac} class="btn sm" style={{ margin: 2 }} onClick={() => {
                const s = simRef.current; if (s) setTactics(s.st.teams[0], { defense: tac });
              }}>{tac}</button>
            ))}
          </div>
        </div>
      </div>

      {huddleUI && (
        <div class="modal-backdrop" data-testid="timeout-huddle">
          <div class="modal panel">
            <h3>{t(lang, 'timeoutHuddle')}</h3>
            <p class="muted">Change tactics or substitute, then resume.</p>
            <div class="row gap wrap">
              <button class="btn" data-testid="btn-huddle-sub" onClick={() => setSubOpen(true)}>{t(lang, 'sub')}</button>
              <button class="btn" onClick={() => setPanelOpen(true)}>{t(lang, 'tactics')}</button>
              <button class="btn primary" data-testid="btn-huddle-close" onClick={closeHuddle}>{t(lang, 'resume')}</button>
            </div>
          </div>
        </div>
      )}

      {subOpen && (
        <div class="modal-backdrop" data-testid="sub-picker">
          <div class="modal panel">
            <h3>{t(lang, 'subPicker')}</h3>
            <div class="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div class="muted">{t(lang, 'subOut')}</div>
                {rotation.filter((id) => getPlayer(id)?.pos !== 'L').map((id) => (
                  <button key={id} class={`btn sm ${subOut === id ? 'primary' : ''}`} style={{ display: 'block', width: '100%', marginBottom: 4 }}
                    data-testid={`sub-out-${id}`} onClick={() => setSubOut(id)}>
                    {getPlayer(id)?.jersey}. {getPlayer(id)?.name} ({getPlayer(id)?.pos})
                  </button>
                ))}
              </div>
              <div>
                <div class="muted">{t(lang, 'subIn')}</div>
                {bench.map((id) => (
                  <button key={id} class={`btn sm ${subIn === id ? 'primary' : ''}`} style={{ display: 'block', width: '100%', marginBottom: 4 }}
                    data-testid={`sub-in-${id}`} onClick={() => setSubIn(id)}>
                    {getPlayer(id)?.jersey}. {getPlayer(id)?.name} ({getPlayer(id)?.pos})
                  </button>
                ))}
              </div>
            </div>
            <div class="row gap" style={{ marginTop: 12 }}>
              <button class="btn primary" data-testid="btn-confirm-sub" disabled={!subOut || !subIn} onClick={confirmSub}>{t(lang, 'confirmSub')}</button>
              <button class="btn" data-testid="btn-cancel-sub" onClick={() => setSubOpen(false)}>{t(lang, 'cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function contrastText(preferred: string, fallback: string): string {
  const pick = preferred || fallback || '#fff';
  if (isDark(pick)) return '#ffd166';
  return pick;
}
function isDark(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return true;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}
