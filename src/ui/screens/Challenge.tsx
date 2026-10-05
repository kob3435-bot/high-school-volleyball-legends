import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import { buildSchoolTeam } from '../../engine/teamBuilder';
import { t } from '../i18n/strings';

const CHALLENGES = [
  { id: 'comeback', title: 'Comeback Kids', desc: 'Beat Shiratorizawo with Karasuna', a: 'karasawa', b: 'shiratori' },
  { id: 'iron', title: 'Break the Wall', desc: 'Score 25 on Date Industrial', a: 'aoba', b: 'date' },
  { id: 'cats', title: 'Cat Fight', desc: 'Out-rally Nekomo High', a: 'fukuro', b: 'nekoma' },
  { id: 'twins', title: 'Twin Storm', desc: 'Win with Inarizako High', a: 'inari', b: 'kamome' },
];

export function Challenge() {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  return (
    <Shell title={t(lang, 'tacticalChallenge')} onBack={ctx.back}>
      <div class="grid modes">
        {CHALLENGES.map((c) => (
          <button key={c.id} class="mode-card" data-testid={`challenge-${c.id}`} onClick={() => {
            const t = buildSchoolTeam(c.a); t.isCPU = false;
            const o = buildSchoolTeam(c.b); o.isCPU = true;
            ctx.nav({ name: 'preview', team: t, opponent: o, mode: 'challenge', seed: Date.now() >>> 0 });
          }}>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </button>
        ))}
      </div>
    </Shell>
  );
}
