import { useContext, useMemo, useState } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell, PlayerCard, StatBar } from '../components';
import { allPlayers, allSchools } from '../../engine/db';
import { ATTR_GROUPS } from '../../engine/types';

export function PlayerDB() {
  const ctx = useContext(Ctx);
  const [q, setQ] = useState('');
  const [school, setSchool] = useState('all');
  const [sel, setSel] = useState<string | null>(null);
  const players = useMemo(() => {
    let list = allPlayers();
    if (school !== 'all') list = list.filter((p) => p.school === school);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    return list.sort((a, b) => b.overall - a.overall);
  }, [q, school]);
  const p = players.find((x) => x.id === sel) ?? players[0];

  return (
    <Shell title="Player Database" subtitle={`${allPlayers().length} players`} onBack={ctx.back}>
      <div class="row gap wrap" style={{ marginBottom: 10 }}>
        <input data-testid="player-search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          placeholder="Search…" style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: '#0f2238', color: '#fff' }} />
        <select value={school} onChange={(e) => setSchool((e.target as HTMLSelectElement).value)}
          style={{ padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
          <option value="all">All schools</option>
          {allSchools().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div class="grid players" style={{ maxHeight: 560, overflow: 'auto' }}>
          {players.slice(0, 80).map((pl) => (
            <PlayerCard key={pl.id} p={pl} selected={p?.id === pl.id} onClick={() => setSel(pl.id)} />
          ))}
        </div>
        {p && (
          <div class="panel" data-testid="player-detail">
            <h2 style={{ marginTop: 0 }}>{p.name}</h2>
            <p><span class={`pos-tag ${p.pos}`}>{p.pos}</span> {p.archetype} · {p.heightCm}cm · OVR {p.overall} · {p.handedness}-handed</p>
            <p class="muted">{p.bio}</p>
            {p.signatures.length > 0 && <p style={{ color: 'var(--accent2)' }}>Signatures: {p.signatures.join(', ')}</p>}
            {Object.entries(ATTR_GROUPS).map(([g, keys]) => (
              <div key={g} style={{ marginTop: 8 }}>
                <strong>{g}</strong>
                {keys.map((k) => <StatBar key={k} label={k} value={p.attrs[k]} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
