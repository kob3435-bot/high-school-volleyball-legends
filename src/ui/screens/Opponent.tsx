import { useContext, useState } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import { SCHOOLS } from '../../data/schools';
import { buildSchoolTeam, randomTeam, allStarTeam } from '../../engine/teamBuilder';
import type { TeamConfig } from '../../engine/types';
import { getPlayer } from '../../engine/db';
import { t } from '../i18n/strings';

export function Opponent({ team, mode }: { team: TeamConfig; mode: string }) {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const [opp, setOpp] = useState<TeamConfig>(() => {
    const o = buildSchoolTeam(mode === 'allstar' ? 'nekoma' : 'nekoma');
    o.isCPU = true;
    return o;
  });

  const pickSchool = (id: string) => {
    const o = buildSchoolTeam(id);
    o.isCPU = true;
    setOpp(o);
  };

  return (
    <Shell title={t(lang, 'selectOpponent')} subtitle={`${t(lang, 'yourTeam')}: ${team.name}`} onBack={ctx.back}>
      <div class="panel">
        <div class="row gap wrap">
          <button class="btn" data-testid="opp-random" onClick={() => { const o = randomTeam(Date.now()); o.isCPU = true; setOpp(o); }}>{t(lang, 'random')}</button>
          <button class="btn" onClick={() => { const o = allStarTeam('east'); o.isCPU = true; setOpp(o); }}>{t(lang, 'allStars')}</button>
        </div>
        <div class="grid modes" style={{ marginTop: 12 }}>
          {SCHOOLS.filter((s) => s.id !== 'legend').slice(0, 20).map((s) => (
            <button key={s.id} class="mode-card" data-testid={`opp-${s.id}`}
              onClick={() => pickSchool(s.id)}
              style={{ outline: opp.template === s.id ? `2px solid ${s.accent}` : undefined }}>
              <h3>{s.name}</h3>
              <p>{s.style}</p>
            </button>
          ))}
        </div>
      </div>
      <div class="panel">
        <h3>Preview: {opp.name}</h3>
        <p class="muted">{opp.rotation.map((id) => getPlayer(id)?.name).join(' · ')}</p>
        <p class="muted">Libero: {opp.libero ? getPlayer(opp.libero)?.name : '—'}</p>
        <button class="btn primary big" data-testid="btn-to-preview"
          onClick={() => ctx.nav({ name: 'preview', team, opponent: opp, mode, seed: (Date.now() ^ 0x9e3779b9) >>> 0 })}>
          Match Preview
        </button>
      </div>
    </Shell>
  );
}
