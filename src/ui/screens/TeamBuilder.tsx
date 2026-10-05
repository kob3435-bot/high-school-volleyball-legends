import { useContext, useEffect, useState } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell, PlayerCard } from '../components';
import { SCHOOLS } from '../../data/schools';
import { playersBySchool, allPlayers, getPlayer } from '../../engine/db';
import { buildSchoolTeam, buildDreamTeam, allStarTeam, validateLineup, randomTeam } from '../../engine/teamBuilder';
import { OFF_TACTICS, DEF_TACTICS, type Tactics } from '../../engine/types';
import { DEFAULT_TACTICS } from '../../engine/TacticalEngine';
import { t } from '../i18n/strings';

export function TeamBuilder({ mode, schoolId }: { mode: string; schoolId?: string }) {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const [school, setSchool] = useState(schoolId ?? 'karasawa');
  const [step, setStep] = useState<'school' | 'six' | 'libero' | 'tactics'>(mode === 'dream' ? 'six' : 'school');
  const [selected, setSelected] = useState<string[]>([]);
  const [libero, setLibero] = useState<string | null>(null);
  const [tactics, setTactics] = useState<Tactics>({ ...DEFAULT_TACTICS });
  const [redirecting, setRedirecting] = useState(mode === 'random' || mode === 'allstar');

  useEffect(() => {
    if (mode === 'random') {
      const team = randomTeam(Date.now());
      team.isCPU = false;
      ctx.nav({ name: 'opponent', team, mode }, true);
    } else if (mode === 'allstar') {
      const team = allStarTeam('legend');
      team.isCPU = false;
      ctx.nav({ name: 'opponent', team, mode }, true);
    }
  }, [mode]);

  if (redirecting) return <div class="screen">{t(ctx.settings.language, 'loading')}</div>;

  const pool = mode === 'dream' ? allPlayers() : playersBySchool(school);
  const liberos = pool.filter((p) => p.pos === 'L');

  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 6 ? [...s, id] : s);
  };

  const autoFill = () => {
    const t = mode === 'dream' ? allStarTeam('legend') : buildSchoolTeam(school, tactics);
    setSelected(t.rotation.slice());
    setLibero(t.libero);
    setStep('tactics');
  };

  const finish = () => {
    const team = mode === 'dream'
      ? buildDreamTeam('Dream Team', selected, libero, tactics)
      : (() => {
          const t = buildSchoolTeam(school, tactics);
          if (selected.length === 6) {
            t.rotation = selected.slice();
            t.libero = libero;
            const used = new Set([...selected, libero].filter(Boolean) as string[]);
            t.bench = playersBySchool(school).filter((p) => !used.has(p.id)).slice(0, 6).map((p) => p.id);
          }
          return t;
        })();
    team.isCPU = false;
    const errs = validateLineup(team.rotation, team.libero);
    if (errs.length) { ctx.toast(errs[0]); return; }
    // Save dream team
    if (mode === 'dream') {
      save.saveDreamTeam({ id: team.id, name: team.name, created: Date.now(), config: team });
    }
    ctx.nav({ name: 'opponent', team, mode });
  };

  return (
    <div data-testid="team-builder">
    <Shell title={t(lang, 'buildTeam')} subtitle={mode === 'dream' ? t(lang, 'dreamBuilder') : t(lang, 'schoolRoster')} onBack={ctx.back}>
      {step === 'school' && mode !== 'dream' && (
        <div class="panel" data-testid="school-pick">
          <h3>{t(lang, 'selectSchool')}</h3>
          <div class="grid modes">
            {SCHOOLS.filter((s) => s.id !== 'legend').slice(0, 16).map((s) => (
              <button key={s.id} class="mode-card" data-testid={`school-${s.id}`}
                style={{ outline: school === s.id ? `2px solid ${s.accent}` : undefined }}
                onClick={() => setSchool(s.id)}>
                <h3 style={{ color: s.accent }}>{s.name}</h3>
                <p>{s.style}</p>
              </button>
            ))}
          </div>
          <div class="row gap" style={{ marginTop: 12 }}>
            <button class="btn primary" data-testid="btn-continue-school" onClick={() => { autoFill(); }}>{t(lang, 'useLineup')}</button>
            <button class="btn" onClick={() => setStep('six')}>{t(lang, 'customSix')}</button>
          </div>
        </div>
      )}

      {step === 'six' && (
        <div class="panel" data-testid="six-pick">
          <div class="row between">
            <h3>{t(lang, 'startingSix')} ({selected.length}/6)</h3>
            <button class="btn sm" onClick={autoFill}>{t(lang, 'autoFill')}</button>
          </div>
          <p class="muted">{t(lang, 'selected')}: {selected.map((id) => getPlayer(id)?.name).filter(Boolean).join(', ') || '—'}</p>
          <div class="grid players" style={{ marginTop: 10, maxHeight: 420, overflow: 'auto' }}>
            {pool.filter((p) => p.pos !== 'L').slice(0, 80).map((p) => (
              <PlayerCard key={p.id} p={p} selected={selected.includes(p.id)} onClick={() => toggle(p.id)} />
            ))}
          </div>
          <button class="btn primary" style={{ marginTop: 12 }} disabled={selected.length !== 6}
            data-testid="btn-to-libero" onClick={() => setStep('libero')}>{t(lang, 'nextLibero')}</button>
        </div>
      )}

      {step === 'libero' && (
        <div class="panel" data-testid="libero-pick">
          <h3>{t(lang, 'selectLibero')}</h3>
          <div class="grid players">
            {liberos.map((p) => (
              <PlayerCard key={p.id} p={p} selected={libero === p.id} onClick={() => setLibero(p.id)} />
            ))}
          </div>
          <div class="row gap" style={{ marginTop: 12 }}>
            <button class="btn" onClick={() => setStep('six')}>{t(lang, 'back')}</button>
            <button class="btn primary" data-testid="btn-to-tactics" disabled={!libero} onClick={() => setStep('tactics')}>{t(lang, 'nextTactics')}</button>
          </div>
        </div>
      )}

      {step === 'tactics' && (
        <div class="panel" data-testid="tactics-pick">
          <h3>{t(lang, 'tactics')}</h3>
          <p class="muted">Lineup: {selected.map((id) => getPlayer(id)?.name).join(', ')} · L: {libero ? getPlayer(libero)?.name : '—'}</p>
          <label class="muted">{t(lang, 'offense')}</label>
          <select value={tactics.offense} data-testid="tactic-offense"
            onChange={(e) => setTactics({ ...tactics, offense: (e.target as HTMLSelectElement).value as Tactics['offense'] })}
            style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff', border: '1px solid var(--line)' }}>
            {OFF_TACTICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label class="muted">{t(lang, 'defense')}</label>
          <select value={tactics.defense} data-testid="tactic-defense"
            onChange={(e) => setTactics({ ...tactics, defense: (e.target as HTMLSelectElement).value as Tactics['defense'] })}
            style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff', border: '1px solid var(--line)' }}>
            {DEF_TACTICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label class="muted">{t(lang, 'serveTarget')}</label>
          <select value={tactics.serveTarget}
            onChange={(e) => setTactics({ ...tactics, serveTarget: (e.target as HTMLSelectElement).value as Tactics['serveTarget'] })}
            style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, background: '#0f2238', color: '#fff', border: '1px solid var(--line)' }}>
            {['auto','weak','zone1','zone5','short','deep','seam'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div class="row gap" style={{ marginTop: 12 }}>
            <button class="btn" onClick={() => setStep('libero')}>{t(lang, 'back')}</button>
            <button class="btn primary big" data-testid="btn-finish-team" onClick={finish}>{t(lang, 'confirmTeam')}</button>
          </div>
        </div>
      )}
    </Shell>
    </div>
  );
}
