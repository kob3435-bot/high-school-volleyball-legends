import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import type { Settings } from '../../engine/SaveEngine';
import { t } from '../i18n/strings';

export function SettingsScreen() {
  const ctx = useContext(Ctx);
  const s = ctx.settings;
  const lang = s.language;
  const patch = (p: Partial<Settings>) => ctx.setSettings({ ...s, ...p });
  return (
    <Shell title={t(lang, 'settings')} onBack={ctx.back}>
      <div class="panel" data-testid="settings">
        <label>{t(lang, 'language')}</label>
        <select data-testid="setting-language" value={s.language}
          onChange={(e) => patch({ language: (e.target as HTMLSelectElement).value as 'en' | 'th' })}
          style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
          <option value="th">ไทย (Thai)</option>
          <option value="en">English</option>
        </select>
        <label>{t(lang, 'volume')} {Math.round(s.volume * 100)}%</label>
        <input type="range" min={0} max={1} step={0.05} value={s.volume}
          onInput={(e) => patch({ volume: Number((e.target as HTMLInputElement).value) })} style={{ width: '100%' }} />
        <label><input type="checkbox" checked={s.muted} onChange={(e) => patch({ muted: (e.target as HTMLInputElement).checked })} /> {t(lang, 'mute')}</label>
        <div style={{ marginTop: 12 }}>
          <label>{t(lang, 'gameSpeed')}</label>
          <select value={s.gameSpeed} onChange={(e) => patch({ gameSpeed: Number((e.target as HTMLSelectElement).value) as 1|2|4 })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value={1}>1x</option><option value={2}>2x</option><option value={4}>4x</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>{t(lang, 'replay')}</label>
          <select data-testid="setting-replay" value={s.replay}
            onChange={(e) => patch({ replay: (e.target as HTMLSelectElement).value as Settings['replay'] })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value="on">{t(lang, 'replayOn')}</option>
            <option value="important">{t(lang, 'replayImportant')}</option>
            <option value="off">{t(lang, 'replayOff')}</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>{t(lang, 'graphics')}</label>
          <select value={s.graphics} onChange={(e) => patch({ graphics: (e.target as HTMLSelectElement).value as Settings['graphics'] })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="ultra">Ultra</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>{t(lang, 'matchFormat')}</label>
          <select value={s.bestOf} onChange={(e) => patch({ bestOf: Number((e.target as HTMLSelectElement).value) as 3|5 })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value={5}>{t(lang, 'bestOf5')}</option>
            <option value={3}>{t(lang, 'bestOf3')}</option>
          </select>
        </div>
      </div>
    </Shell>
  );
}
