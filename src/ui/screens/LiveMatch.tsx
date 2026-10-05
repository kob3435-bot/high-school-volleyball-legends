import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { Ctx } from '../store';
import { MatchSim } from '../../engine/Match';
import type { TeamConfig } from '../../engine/types';
import { CourtView } from '../render/CourtView';
import { sfxForEvent } from '../sound';
import { OFF_TACTICS, DEF_TACTICS } from '../../engine/types';
import { setTactics } from '../../engine/TacticalEngine';

export function LiveMatch({ team, opponent, mode, seed }: {
  team: TeamConfig; opponent: TeamConfig; mode: string; seed: number;
}) {
  const ctx = useContext(Ctx);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<MatchSim | null>(null);
  const viewRef = useRef<CourtView | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(ctx.settings.gameSpeed);
  const [commentary, setCommentary] = useState('Match starting…');
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [sets, setSets] = useState<[number, number]>([0, 0]);
  const [setNo, setSetNo] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [serving, setServing] = useState(0);
  const accum = useRef(0);
  const last = useRef(0);

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
    viewRef.current = view;

    const canvas = canvasRef.current!;
    const ctx2 = canvas.getContext('2d')!;
    let raf = 0;
    last.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const v = viewRef.current!;
      const s = simRef.current!;

      if (!paused && !s.finished) {
        accum.current += dt * speed;
        // chunked: one rally step per ~0.9s at 1x (faster at higher speed)
        const interval = 0.85 / Math.max(1, speed * 0.6);
        while (accum.current >= interval && !s.finished) {
          accum.current -= interval;
          const evs = s.step();
          v.setLineups([s.st.teams[0].rotation.slice(), s.st.teams[1].rotation.slice()]);
          v.serving = s.st.serving;
          v.apply(evs);
          for (const e of evs) {
            if (e.text) setCommentary(e.text);
            sfxForEvent(e.type, e.team);
          }
          setScore([s.st.teams[0].score, s.st.teams[1].score]);
          setSets([...s.st.setsWon] as [number, number]);
          setSetNo(s.st.setNumber);
          setServing(s.st.serving);
        }
      }

      // resize
      const parent = canvas.parentElement!;
      const w = parent.clientWidth, h = parent.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      v.update(dt);
      v.draw(ctx2, w, h);

      if (s.finished) {
        const result = s.getResult();
        setTimeout(() => ctx.nav({ name: 'results', result, team, opponent, mode, seed }, true), 600);
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
    const evs = s.step();
    v?.apply(evs);
    setScore([s.st.teams[0].score, s.st.teams[1].score]);
    setSets([...s.st.setsWon] as [number, number]);
    for (const e of evs) if (e.text) setCommentary(e.text);
  };
  const skipSet = () => {
    const s = simRef.current;
    if (!s || s.finished) return;
    s.skipSet();
    setScore([s.st.teams[0].score, s.st.teams[1].score]);
    setSets([...s.st.setsWon] as [number, number]);
    setSetNo(s.st.setNumber);
    setCommentary('Set skipped (simulated)');
    if (s.finished) {
      ctx.nav({ name: 'results', result: s.getResult(), team, opponent, mode, seed }, true);
    }
  };

  return (
    <div class="live-wrap" data-testid="live-match">
      <div class="live-top">
        <div class="scoreboard">
          <div class="team" style={{ color: team.secondary }}>{team.short}</div>
          <div class="sets">{[0,1,2].map((i) => <div key={i} class={`set-pip ${sets[0] > i ? 'on' : ''}`} />)}</div>
          <div class="pts" data-testid="score">{score[0]} – {score[1]}</div>
          <div class="sets">{[0,1,2].map((i) => <div key={i} class={`set-pip ${sets[1] > i ? 'on' : ''}`} />)}</div>
          <div class="team right" style={{ color: opponent.secondary }}>{opponent.short}</div>
        </div>
        <div class="muted">Set {setNo} · Serve: {serving === 0 ? team.short : opponent.short}</div>
        <div class="row gap wrap">
          <button class="btn sm" data-testid="btn-pause" onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
          {[1, 2, 4].map((sp) => (
            <button key={sp} class={`btn sm ${speed === sp ? 'primary' : ''}`} data-testid={`speed-${sp}`}
              onClick={() => setSpeed(sp as 1|2|4)}>{sp}x</button>
          ))}
          <button class="btn sm" data-testid="btn-skip-rally" onClick={skipRally}>Skip Rally</button>
          <button class="btn sm" data-testid="btn-skip-set" onClick={skipSet}>Skip Set</button>
          <button class="btn sm" data-testid="btn-tactics" onClick={() => setPanelOpen((o) => !o)}>Tactics</button>
          <button class="btn sm" data-testid="btn-timeout" onClick={() => simRef.current?.requestTimeout(0)}>Timeout</button>
        </div>
      </div>
      <div class="court-stage">
        <canvas ref={canvasRef} data-testid="court-canvas" />
        <div class="overlay-chip" style={{ top: 8, left: 8 }}>{commentary}</div>
      </div>
      <div class="live-bottom">
        <div class="commentary" data-testid="commentary">{commentary}</div>
        <div class={`tactical-panel ${panelOpen ? 'open' : ''}`} data-testid="tactical-panel">
          <div>
            <div class="muted">Offense</div>
            {OFF_TACTICS.map((t) => (
              <button key={t} class="btn sm" style={{ margin: 2 }} onClick={() => {
                const s = simRef.current; if (s) setTactics(s.st.teams[0], { offense: t });
              }}>{t}</button>
            ))}
          </div>
          <div>
            <div class="muted">Defense</div>
            {DEF_TACTICS.map((t) => (
              <button key={t} class="btn sm" style={{ margin: 2 }} onClick={() => {
                const s = simRef.current; if (s) setTactics(s.st.teams[0], { defense: t });
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
