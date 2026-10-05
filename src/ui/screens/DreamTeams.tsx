import { useContext, useState } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell } from '../components';
import type { SavedTeam } from '../../engine/SaveEngine';
import { t } from '../i18n/strings';

export function DreamTeams() {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const [teams, setTeams] = useState(() => save.listDreamTeams());

  return (
    <Shell title={t(lang, 'dream')} subtitle={t(lang, 'savedLineups')} onBack={ctx.back}>
      <button class="btn primary" data-testid="btn-new-dream" onClick={() => ctx.nav({ name: 'builder', mode: 'dream' })}>
        Build New Dream Team
      </button>
      <div class="grid modes" style={{ marginTop: 14 }}>
        {teams.map((t: SavedTeam) => (
          <div class="panel" key={t.id}>
            <h3>{t.name}</h3>
            <p class="muted">{new Date(t.created).toLocaleString()}</p>
            <div class="row gap">
              <button class="btn primary sm" onClick={() => ctx.nav({ name: 'opponent', team: t.config, mode: 'dream' })}>Play</button>
              <button class="btn sm" onClick={() => { save.deleteDreamTeam(t.id); setTeams(save.listDreamTeams()); }}>Delete</button>
            </div>
          </div>
        ))}
        {teams.length === 0 && <p class="muted">{t(lang, 'noSavedTeams')}</p>}
      </div>
    </Shell>
  );
}
