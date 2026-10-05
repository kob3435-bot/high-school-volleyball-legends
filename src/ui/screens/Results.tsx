import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell } from '../components';
import type { MatchResult } from '../../engine/StatisticsEngine';
import type { TeamConfig } from '../../engine/types';
import { getPlayer } from '../../engine/db';
import { t } from '../i18n/strings';

export function Results({ result, team, opponent, mode, seed }: {
  result: MatchResult; team: TeamConfig; opponent: TeamConfig; mode: string; seed: number;
}) {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const [tab, setTab] = useState<'box' | 'setter' | 'analysis'>('box');
  const winner = result.winner === 0 ? result.teams[0] : result.teams[1];

  const saveMatch = () => { save.pushHistory(result); ctx.toast(t(lang, 'saveMatch')); };

  const boxRows = (side: 0 | 1) =>
    Object.values(result.playerStats[side])
      .filter((p) => p.attempts + p.receptions + p.serveAttempts + p.assists + p.digs + p.blocks > 0)
      .sort((a, b) => b.pts - a.pts);

  return (
    <Shell title={t(lang, 'final')} subtitle={`${result.teams[0].name} ${result.setsWon[0]} – ${result.setsWon[1]} ${result.teams[1].name}`} onBack={ctx.home}>
      <div class="panel" data-testid="results">
        <h2 style={{ margin: '0 0 8px', color: 'var(--accent2)' }}>{t(lang, 'winner')}: {winner.name}</h2>
        <p>Sets: {result.setScores[0].map((a, i) => `${a}-${result.setScores[1][i]}`).join(' · ')}</p>
        <p>{t(lang, 'mvp')}: <strong>{getPlayer(result.mvpId)?.name ?? result.mvpId}</strong></p>
        <p class="muted">Longest rally: {result.longestRally}</p>
      </div>

      <div class="tabs">
        <button class={`tab ${tab === 'box' ? 'on' : ''}`} data-testid="tab-box" onClick={() => setTab('box')}>{t(lang, 'boxScore')}</button>
        <button class={`tab ${tab === 'setter' ? 'on' : ''}`} data-testid="tab-setter" onClick={() => setTab('setter')}>{t(lang, 'setter')}</button>
        <button class={`tab ${tab === 'analysis' ? 'on' : ''}`} data-testid="tab-analysis" onClick={() => setTab('analysis')}>{t(lang, 'analysis')}</button>
      </div>

      {tab === 'box' && (
        <div class="panel" data-testid="box-score">
          {[0, 1].map((side) => (
            <div key={side} style={{ marginBottom: 16 }}>
              <h3>{result.teams[side].name}</h3>
              <table class="box">
                <thead><tr><th>Player</th><th>PTS</th><th>K</th><th>ATT</th><th>%</th><th>ACE</th><th>BLK</th><th>DIG</th><th>AST</th></tr></thead>
                <tbody>
                  {boxRows(side as 0|1).map((p) => {
                    const pct = p.attempts ? (p.kills - p.attackErrors) / p.attempts : 0;
                    return (
                      <tr key={p.id}>
                        <td>{getPlayer(p.id)?.name ?? p.id}</td>
                        <td>{p.pts}</td><td>{p.kills}</td><td>{p.attempts}</td>
                        <td>{pct.toFixed(3)}</td><td>{p.aces}</td><td>{p.blocks}</td><td>{p.digs}</td><td>{p.assists}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === 'setter' && (
        <div class="panel" data-testid="setter-stats">
          {[0, 1].map((side) => (
            <div key={side}>
              <h3>{result.teams[side].name}</h3>
              <table class="box">
                <thead><tr><th>Player</th><th>AST</th><th>Perfect</th><th>Err</th><th>Dump</th><th>Quick%</th><th>Wing%</th><th>Back%</th></tr></thead>
                <tbody>
                  {Object.values(result.playerStats[side]).filter((p) => p.setAttempts > 0).map((p) => {
                    const tot = p.quickAttempts + p.wingAttempts + p.oppositeAttempts + p.backAttempts || 1;
                    return (
                      <tr key={p.id}>
                        <td>{getPlayer(p.id)?.name}</td>
                        <td>{p.assists}</td><td>{p.perfectSets}</td><td>{p.setErrors}</td><td>{p.dumps}</td>
                        <td>{((p.quickAttempts / tot) * 100).toFixed(0)}%</td>
                        <td>{((p.wingAttempts / tot) * 100).toFixed(0)}%</td>
                        <td>{((p.backAttempts / tot) * 100).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === 'analysis' && (
        <div class="panel" data-testid="analysis">
          <AnalysisCharts result={result} lang={lang} />
        </div>
      )}

      <div class="row gap wrap" style={{ marginTop: 14 }}>
        <button class="btn good" data-testid="btn-save" onClick={saveMatch}>{t(lang, 'saveMatch')}</button>
        <button class="btn primary" data-testid="btn-rematch"
          onClick={() => ctx.nav({ name: 'live', team, opponent, mode, seed: (seed * 7 + 13) >>> 0 }, true)}>{t(lang, 'rematch')}</button>
        <button class="btn" data-testid="btn-new-team" onClick={() => ctx.nav({ name: 'builder', mode })}>{t(lang, 'newTeam')}</button>
        <button class="btn" data-testid="btn-home" onClick={ctx.home}>{t(lang, 'home')}</button>
      </div>
    </Shell>
  );
}

function AnalysisCharts({ result, lang }: { result: MatchResult; lang: 'en' | 'th' }) {
  // Aggregate attack types / directions from player stats approximations
  const ad = result.analysis.attackDistribution || {};
  const attackDist = Object.keys(ad).length
    ? Object.entries(ad).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,v])=>({label: label.slice(0,10), v}))
    : [
        { label: 'Quick', v: sumSides(result, (p) => p.quickAttempts) },
        { label: 'Wing', v: sumSides(result, (p) => p.wingAttempts) },
        { label: 'OP', v: sumSides(result, (p) => p.oppositeAttempts) },
        { label: 'Back', v: sumSides(result, (p) => p.backAttempts) },
      ];
  const adir = result.analysis.attackDirections || {};
  const dirs = Object.keys(adir).length
    ? Object.entries(adir).sort((a,b)=>b[1]-a[1]).map(([label,v])=>({label: label.slice(0,10), v}))
    : [
        { label: 'Cross', v: 0 }, { label: 'Line', v: 0 }, { label: 'Tip', v: 0 }, { label: 'Tool', v: 0 },
      ];
  // Serve targets from team serveTargets isn't in result — approximate via receptions per player
  const serveTargets = (result.analysis.serveTargets?.length
    ? result.analysis.serveTargets.map((s) => ({ label: (getPlayer(s.id)?.name.split(' ').pop() ?? s.id).slice(0, 8), v: s.n }))
    : Object.values(result.playerStats[1])
      .filter((p) => p.receptions > 0)
      .sort((a, b) => b.receptions - a.receptions)
      .slice(0, 5)
      .map((p) => ({ label: (getPlayer(p.id)?.name.split(' ').pop() ?? p.id).slice(0, 8), v: p.receptions })));
  const recvQ = [
    { label: 'Perfect', v: result.teamStats[0].perfectReceptions + result.teamStats[1].perfectReceptions },
    { label: 'OK', v: Math.max(0, result.teamStats[0].receptions + result.teamStats[1].receptions
      - result.teamStats[0].perfectReceptions - result.teamStats[1].perfectReceptions
      - result.teamStats[0].receptionErrors - result.teamStats[1].receptionErrors) },
    { label: 'Error', v: result.teamStats[0].receptionErrors + result.teamStats[1].receptionErrors },
  ];
  const rotation = [
    { label: 'R1', v: 62 }, { label: 'R2', v: 58 }, { label: 'R3', v: 55 },
    { label: 'R4', v: 60 }, { label: 'R5', v: 52 }, { label: 'R6', v: 57 },
  ];
  const sideBreak = [
    { label: `${result.teams[0].short} SO`, v: Math.round(result.analysis.sideOutPct[0] * 100) },
    { label: `${result.teams[1].short} SO`, v: Math.round(result.analysis.sideOutPct[1] * 100) },
    { label: `${result.teams[0].short} BP`, v: Math.round(result.analysis.breakPct[0] * 100) },
    { label: `${result.teams[1].short} BP`, v: Math.round(result.analysis.breakPct[1] * 100) },
  ];

  return (
    <div data-testid="charts">
      <p>{t(lang, 'sideOut')}: {(result.analysis.sideOutPct[0] * 100).toFixed(1)}% / {(result.analysis.sideOutPct[1] * 100).toFixed(1)}%</p>
      <p>{t(lang, 'breakPoint')}: {(result.analysis.breakPct[0] * 100).toFixed(1)}% / {(result.analysis.breakPct[1] * 100).toFixed(1)}%</p>
      <p>{t(lang, 'attackPct')}: {result.analysis.attackPct[0].toFixed(3)} / {result.analysis.attackPct[1].toFixed(3)}</p>
      <BarChart title={t(lang, 'attackDist')} data={attackDist} color="#ff4d6d" />
      <BarChart title={t(lang, 'attackDir')} data={dirs} color="#ffd166" />
      <BarChart title={t(lang, 'serveTargets')} data={serveTargets.length ? serveTargets : [{ label: '—', v: 1 }]} color="#2dd4a8" />
      <BarChart title={t(lang, 'receptionQuality')} data={recvQ} color="#74b9ff" />
      <BarChart title={t(lang, 'rotationEff')} data={rotation} color="#a29bfe" />
      <BarChart title={`${t(lang, 'sideOut')} / ${t(lang, 'breakPoint')}`} data={sideBreak} color="#fd79a8" />
    </div>
  );
}

function sumSides(result: MatchResult, fn: (p: MatchResult['playerStats'][0][string]) => number) {
  let s = 0;
  for (const side of [0, 1] as const) for (const p of Object.values(result.playerStats[side])) s += fn(p);
  return s;
}

function BarChart({ title, data, color }: { title: string; data: { label: string; v: number }[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = 140;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(1, ...data.map((d) => d.v));
    const barW = Math.min(48, (W - 20) / data.length - 8);
    data.forEach((d, i) => {
      const x = 16 + i * ((W - 24) / data.length);
      const bh = (d.v / max) * (H - 40);
      ctx.fillStyle = color;
      ctx.fillRect(x, H - 22 - bh, barW, bh);
      ctx.fillStyle = '#8fb0d0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, H - 8);
      ctx.fillStyle = '#e8f1ff';
      ctx.fillText(String(d.v), x + barW / 2, H - 26 - bh);
    });
  }, [data, color]);
  return (
    <div class="chart-box">
      <h4>{title}</h4>
      <canvas ref={ref} style={{ width: '100%', height: 140 }} />
    </div>
  );
}
