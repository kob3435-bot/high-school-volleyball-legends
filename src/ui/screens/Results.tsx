import { useContext, useState } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell } from '../components';
import type { MatchResult } from '../../engine/StatisticsEngine';
import type { TeamConfig } from '../../engine/types';
import { getPlayer } from '../../engine/db';

export function Results({ result, team, opponent, mode, seed }: {
  result: MatchResult; team: TeamConfig; opponent: TeamConfig; mode: string; seed: number;
}) {
  const ctx = useContext(Ctx);
  const [tab, setTab] = useState<'box' | 'setter' | 'analysis'>('box');
  const winner = result.winner === 0 ? result.teams[0] : result.teams[1];

  const saveMatch = () => {
    save.pushHistory(result);
    ctx.toast('Match saved to history');
  };

  const boxRows = (side: 0 | 1) => {
    const ps = result.playerStats[side];
    return Object.values(ps).filter((p) => p.attempts + p.receptions + p.serveAttempts + p.assists + p.digs + p.blocks > 0)
      .sort((a, b) => b.pts - a.pts);
  };

  return (
    <Shell title="Final" subtitle={`${result.teams[0].name} ${result.setsWon[0]} – ${result.setsWon[1]} ${result.teams[1].name}`} onBack={ctx.home}>
      <div class="panel" data-testid="results">
        <h2 style={{ margin: '0 0 8px', color: 'var(--accent2)' }}>Winner: {winner.name}</h2>
        <p>Sets: {result.setScores[0].map((a, i) => `${a}-${result.setScores[1][i]}`).join(' · ')}</p>
        <p>MVP: <strong>{getPlayer(result.mvpId)?.name ?? result.mvpId}</strong> (from real performance)</p>
        <p class="muted">Best Spiker: {getPlayer(result.bestSpiker)?.name} · Setter: {getPlayer(result.bestSetter)?.name} · Blocker: {getPlayer(result.bestBlocker)?.name} · Receiver: {getPlayer(result.bestReceiver)?.name}</p>
        <p class="muted">Longest rally: {result.longestRally} contacts</p>
      </div>

      <div class="tabs">
        <button class={`tab ${tab === 'box' ? 'on' : ''}`} data-testid="tab-box" onClick={() => setTab('box')}>Box Score</button>
        <button class={`tab ${tab === 'setter' ? 'on' : ''}`} data-testid="tab-setter" onClick={() => setTab('setter')}>Setter</button>
        <button class={`tab ${tab === 'analysis' ? 'on' : ''}`} data-testid="tab-analysis" onClick={() => setTab('analysis')}>Analysis</button>
      </div>

      {tab === 'box' && (
        <div class="panel" data-testid="box-score">
          {[0, 1].map((side) => (
            <div key={side} style={{ marginBottom: 16 }}>
              <h3>{result.teams[side].name}</h3>
              <table class="box">
                <thead>
                  <tr>
                    <th>Player</th><th>PTS</th><th>K</th><th>ATT</th><th>%</th><th>ACE</th><th>SE</th><th>BLK</th><th>DIG</th><th>REC</th><th>AST</th>
                  </tr>
                </thead>
                <tbody>
                  {boxRows(side as 0|1).map((p) => {
                    const def = getPlayer(p.id);
                    const pct = p.attempts ? ((p.kills - p.attackErrors) / p.attempts) : 0;
                    return (
                      <tr key={p.id}>
                        <td>{def?.name ?? p.id}</td>
                        <td>{p.pts}</td><td>{p.kills}</td><td>{p.attempts}</td>
                        <td>{pct.toFixed(3)}</td>
                        <td>{p.aces}</td><td>{p.serveErrors}</td><td>{p.blocks}</td>
                        <td>{p.digs}</td><td>{p.receptions}</td><td>{p.assists}</td>
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
              <h3>{result.teams[side].name} Setters</h3>
              <table class="box">
                <thead><tr><th>Player</th><th>AST</th><th>Perfect</th><th>Err</th><th>Dump</th><th>DumpK</th><th>Quick%</th><th>Wing%</th><th>Back%</th></tr></thead>
                <tbody>
                  {Object.values(result.playerStats[side]).filter((p) => p.setAttempts > 0).map((p) => {
                    const tot = p.quickAttempts + p.wingAttempts + p.oppositeAttempts + p.backAttempts || 1;
                    return (
                      <tr key={p.id}>
                        <td>{getPlayer(p.id)?.name}</td>
                        <td>{p.assists}</td><td>{p.perfectSets}</td><td>{p.setErrors}</td>
                        <td>{p.dumps}</td><td>{p.dumpKills}</td>
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
          <h3>Tactical Analysis</h3>
          <p>Side-out %: {(result.analysis.sideOutPct[0] * 100).toFixed(1)}% / {(result.analysis.sideOutPct[1] * 100).toFixed(1)}%</p>
          <p>Break point %: {(result.analysis.breakPct[0] * 100).toFixed(1)}% / {(result.analysis.breakPct[1] * 100).toFixed(1)}%</p>
          <p>Attack %: {result.analysis.attackPct[0].toFixed(3)} / {result.analysis.attackPct[1].toFixed(3)}</p>
          <p>Ace %: {(result.analysis.acePct[0] * 100).toFixed(1)}% / {(result.analysis.acePct[1] * 100).toFixed(1)}%</p>
          <p>Reception %: {(result.analysis.receptionPct[0] * 100).toFixed(1)}% / {(result.analysis.receptionPct[1] * 100).toFixed(1)}%</p>
          <p>Most effective combination: <strong>{result.analysis.mostEffectiveCombo}</strong></p>
          {result.turningPoints.length > 0 && (
            <div>
              <h4>Turning Points</h4>
              <ul>{result.turningPoints.map((tp, i) => <li key={i}>{tp.text} (Set {tp.set}: {tp.score[0]}-{tp.score[1]})</li>)}</ul>
            </div>
          )}
          <h4>Player Ratings</h4>
          <div class="grid players">
            {Object.entries(result.ratings).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, r]) => (
              <div class="player-card" key={id}><div class="name">{getPlayer(id)?.name}</div><div class="ovr">{r.toFixed(1)}</div></div>
            ))}
          </div>
        </div>
      )}

      <div class="row gap wrap" style={{ marginTop: 14 }}>
        <button class="btn good" data-testid="btn-save" onClick={saveMatch}>Save Match</button>
        <button class="btn primary" data-testid="btn-rematch"
          onClick={() => ctx.nav({ name: 'live', team, opponent, mode, seed: (seed * 7 + 13) >>> 0 }, true)}>Rematch</button>
        <button class="btn" data-testid="btn-new-team" onClick={() => ctx.nav({ name: 'builder', mode })}>New Team</button>
        <button class="btn" data-testid="btn-home" onClick={ctx.home}>Home</button>
      </div>
    </Shell>
  );
}
