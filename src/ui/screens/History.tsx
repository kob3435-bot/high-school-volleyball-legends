import { useContext } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell } from '../components';
import { getPlayer } from '../../engine/db';

export function History() {
  const ctx = useContext(Ctx);
  const hist = save.listHistory();
  return (
    <Shell title="Match History" onBack={ctx.back}>
      <div data-testid="history-list">
        {hist.length === 0 && <p class="muted">No saved matches yet.</p>}
        {hist.map((h) => (
          <div class="panel" key={h.id} style={{ marginBottom: 8 }}>
            <div class="row between wrap">
              <strong>{h.result.teams[0].short} {h.result.setsWon[0]}–{h.result.setsWon[1]} {h.result.teams[1].short}</strong>
              <span class="muted">{new Date(h.ts).toLocaleString()}</span>
            </div>
            <p class="muted">MVP: {getPlayer(h.result.mvpId)?.name} · {h.result.mode}</p>
            <p class="muted">Sets: {h.result.setScores[0].map((a, i) => `${a}-${h.result.setScores[1][i]}`).join(', ')}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
