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
        {t(lang, 'buildNewDream')}
      </button>
      <div class="grid modes" style={{ marginTop: 14 }}>
        {teams.map((dt: SavedTeam) => (
          <div class="panel" key={dt.id}>
            <h3>{dt.name}</h3>
            <p class="muted">{new Date(dt.created).toLocaleString()}</p>
            <div class="row gap">
              <button class="btn primary sm" onClick={() => ctx.nav({ name: 'opponent', team: dt.config, mode: 'dream' })}>{t(lang, 'playTeam')}</button>
              <button class="btn sm" onClick={() => { save.deleteDreamTeam(dt.id); setTeams(save.listDreamTeams()); }}>{t(lang, 'delete')}</button>
            </div>
          </div>
        ))}
        {teams.length === 0 && <p class="muted">{t(lang, 'noSavedTeams')}</p>}
      </div>
    </Shell>
  );
}
