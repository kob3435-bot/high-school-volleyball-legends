import { useContext } from 'preact/hooks';
import { Ctx } from '../store';
import { Shell } from '../components';
import type { Settings } from '../../engine/SaveEngine';

export function SettingsScreen() {
  const ctx = useContext(Ctx);
  const s = ctx.settings;
  const patch = (p: Partial<Settings>) => ctx.setSettings({ ...s, ...p });
  return (
    <Shell title="Settings" onBack={ctx.back}>
      <div class="panel" data-testid="settings">
        <label>Volume {Math.round(s.volume * 100)}%</label>
        <input type="range" min={0} max={1} step={0.05} value={s.volume}
          onInput={(e) => patch({ volume: Number((e.target as HTMLInputElement).value) })} style={{ width: '100%' }} />
        <label><input type="checkbox" checked={s.muted} onChange={(e) => patch({ muted: (e.target as HTMLInputElement).checked })} /> Mute</label>
        <div style={{ marginTop: 12 }}>
          <label>Game Speed</label>
          <select value={s.gameSpeed} onChange={(e) => patch({ gameSpeed: Number((e.target as HTMLSelectElement).value) as 1|2|4 })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value={1}>1x</option><option value={2}>2x</option><option value={4}>4x</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Replay</label>
          <select value={s.replay} onChange={(e) => patch({ replay: (e.target as HTMLSelectElement).value as Settings['replay'] })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value="on">On</option><option value="important">Important Only</option><option value="off">Off</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Graphics</label>
          <select value={s.graphics} onChange={(e) => patch({ graphics: (e.target as HTMLSelectElement).value as Settings['graphics'] })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="ultra">Ultra</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Match Format</label>
          <select value={s.bestOf} onChange={(e) => patch({ bestOf: Number((e.target as HTMLSelectElement).value) as 3|5 })}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            <option value={5}>Best of 5</option><option value={3}>Best of 3</option>
          </select>
        </div>
      </div>
    </Shell>
  );
}
