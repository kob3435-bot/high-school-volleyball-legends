import { useContext } from 'preact/hooks';
import { Ctx } from '../store';

const MODES = [
  { id: 'quick', title: 'Quick Match', desc: 'Pick a school and play immediately', screen: 'builder' as const },
  { id: 'dream', title: 'Dream Team', desc: 'Build from all players, save multiple teams', screen: 'dreams' as const },
  { id: 'tournament', title: 'National Tournament', desc: '32 teams · R32 to Final', screen: 'tournament' as const },
  { id: 'school', title: 'School Mode', desc: 'Play with a single school roster', screen: 'builder' as const },
  { id: 'random', title: 'Random Battle', desc: 'Random schools, random tactics', screen: 'builder' as const },
  { id: 'allstar', title: 'All-Star Battle', desc: 'Legend pool showdown', screen: 'builder' as const },
  { id: 'watch', title: 'Watch Mode', desc: 'CPU vs CPU broadcast', screen: 'watch' as const },
  { id: 'challenge', title: 'Tactical Challenge', desc: 'Scenario objectives', screen: 'challenge' as const },
];

export function Home() {
  const ctx = useContext(Ctx);
  return (
    <div class="screen" data-testid="home">
      <h1 class="title">HIGH SCHOOL VOLLEYBALL LEGENDS</h1>
      <p class="subtitle">Rally-by-rally tactical simulation · Dream team builder · National stage</p>
      <div class="grid modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            class="mode-card"
            data-testid={`mode-${m.id}`}
            onClick={() => {
              if (m.screen === 'builder') ctx.nav({ name: 'builder', mode: m.id });
              else if (m.screen === 'dreams') ctx.nav({ name: 'dreams' });
              else if (m.screen === 'tournament') ctx.nav({ name: 'tournament' });
              else if (m.screen === 'watch') ctx.nav({ name: 'watch' });
              else if (m.screen === 'challenge') ctx.nav({ name: 'challenge' });
            }}
          >
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
      <div class="row gap wrap" style={{ marginTop: 18 }}>
        <button class="btn" data-testid="nav-players" onClick={() => ctx.nav({ name: 'players' })}>Player Database</button>
        <button class="btn" data-testid="nav-history" onClick={() => ctx.nav({ name: 'history' })}>Match History</button>
        <button class="btn" data-testid="nav-settings" onClick={() => ctx.nav({ name: 'settings' })}>Settings</button>
      </div>
    </div>
  );
}
