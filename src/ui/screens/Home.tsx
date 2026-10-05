import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { t } from '../i18n/strings';

export function Home() {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const MODES = [
    { id: 'quick', title: t(lang, 'quick'), desc: lang === 'th' ? 'เลือกโรงเรียนแล้วเล่นทันที' : 'Pick a school and play immediately', screen: 'builder' as const },
    { id: 'dream', title: t(lang, 'dream'), desc: lang === 'th' ? 'เลือกจากทุกคน บันทึกหลายทีม' : 'Build from all players, save multiple teams', screen: 'dreams' as const },
    { id: 'tournament', title: t(lang, 'tournament'), desc: lang === 'th' ? '32 ทีม · R32 ถึงชิงชนะเลิศ' : '32 teams · R32 to Final', screen: 'tournament' as const },
    { id: 'school', title: t(lang, 'school'), desc: lang === 'th' ? 'เล่นด้วยนักกีฬาของโรงเรียน' : 'Play with a single school roster', screen: 'builder' as const },
    { id: 'random', title: t(lang, 'random'), desc: lang === 'th' ? 'สุ่มโรงเรียนและแทคติก' : 'Random schools, random tactics', screen: 'builder' as const },
    { id: 'allstar', title: t(lang, 'allstar'), desc: lang === 'th' ? 'รวมตำนาน' : 'Legend pool showdown', screen: 'builder' as const },
    { id: 'watch', title: t(lang, 'watch'), desc: lang === 'th' ? 'CPU ปะทะ CPU' : 'CPU vs CPU broadcast', screen: 'watch' as const },
    { id: 'challenge', title: t(lang, 'challenge'), desc: lang === 'th' ? 'ภารกิจตามสถานการณ์' : 'Scenario objectives', screen: 'challenge' as const },
  ];
  return (
    <div class="screen" data-testid="home">
      <h1 class="title">{t(lang, 'title')}</h1>
      <p class="subtitle">{t(lang, 'subtitle')}</p>
      <div class="grid modes">
        {MODES.map((m) => (
          <button key={m.id} class="mode-card" data-testid={`mode-${m.id}`}
            onClick={() => {
              if (m.screen === 'builder') ctx.nav({ name: 'builder', mode: m.id });
              else if (m.screen === 'dreams') ctx.nav({ name: 'dreams' });
              else if (m.screen === 'tournament') ctx.nav({ name: 'tournament' });
              else if (m.screen === 'watch') ctx.nav({ name: 'watch' });
              else if (m.screen === 'challenge') ctx.nav({ name: 'challenge' });
            }}>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
      <div class="row gap wrap" style={{ marginTop: 18 }}>
        <button class="btn" data-testid="nav-players" onClick={() => ctx.nav({ name: 'players' })}>{t(lang, 'players')}</button>
        <button class="btn" data-testid="nav-history" onClick={() => ctx.nav({ name: 'history' })}>{t(lang, 'history')}</button>
        <button class="btn" data-testid="nav-settings" onClick={() => ctx.nav({ name: 'settings' })}>{t(lang, 'settings')}</button>
      </div>
    </div>
  );
}
