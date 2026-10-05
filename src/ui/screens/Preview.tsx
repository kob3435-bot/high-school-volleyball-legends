import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import type { TeamConfig } from '../../engine/types';
import { getPlayer } from '../../engine/db';

export function Preview({ team, opponent, mode, seed }: { team: TeamConfig; opponent: TeamConfig; mode: string; seed: number }) {
  const ctx = useContext(Ctx);
  return (
    <Shell title="Match Preview" subtitle={`${team.name} vs ${opponent.name}`} onBack={ctx.back}>
      <div class="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[team, opponent].map((t, i) => (
          <div class="panel" key={i} style={{ borderTop: `4px solid ${t.primary}` }}>
            <h3>{t.name}</h3>
            <p class="muted">{t.tactics.offense} / {t.tactics.defense}</p>
            <ol style={{ paddingLeft: 18, margin: '8px 0' }}>
              {t.rotation.map((id) => {
                const p = getPlayer(id);
                return <li key={id}>{p?.jersey}. {p?.name} <span class={`pos-tag ${p?.pos}`}>{p?.pos}</span> OVR {p?.overall}</li>;
              })}
            </ol>
            <p class="muted">Libero: {t.libero ? getPlayer(t.libero)?.name : '—'}</p>
          </div>
        ))}
      </div>
      <div class="row gap" style={{ marginTop: 16 }}>
        <button class="btn primary big" data-testid="btn-start-match"
          onClick={() => ctx.nav({ name: 'live', team, opponent, mode, seed })}>
          Start Match
        </button>
        <button class="btn" onClick={ctx.back}>Back</button>
      </div>
    </Shell>
  );
}
