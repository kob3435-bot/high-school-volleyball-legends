import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import { buildSchoolTeam } from '../../engine/teamBuilder';

export function WatchMode() {
  const ctx = useContext(Ctx);
  const start = (a: string, b: string) => {
    const t0 = buildSchoolTeam(a); t0.isCPU = true;
    const t1 = buildSchoolTeam(b); t1.isCPU = true;
    ctx.nav({ name: 'live', team: t0, opponent: t1, mode: 'watch', seed: Date.now() >>> 0 });
  };
  return (
    <Shell title="Watch Mode" subtitle="CPU vs CPU" onBack={ctx.back}>
      <div class="grid modes">
        {[
          ['karasawa', 'nekoma'], ['karasawa', 'shiratori'], ['inari', 'karasawa'],
          ['fukuro', 'nekoma'], ['kamome', 'karasawa'], ['date', 'aoba'],
        ].map(([a, b]) => (
          <button key={a + b} class="mode-card" onClick={() => start(a, b)}>
            <h3>{a} vs {b}</h3>
            <p>Watch the rally</p>
          </button>
        ))}
      </div>
    </Shell>
  );
}
