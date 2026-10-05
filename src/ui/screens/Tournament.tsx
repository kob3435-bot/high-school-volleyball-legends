import { useContext, useState } from 'preact/hooks';
import { Ctx, save } from '../store';
import { Shell } from '../components';
import { createTournament, simAllCPU, simMatch, advanceRound, type TournamentState } from '../../engine/Tournament';
import { buildSchoolTeam } from '../../engine/teamBuilder';
import { MatchSim } from '../../engine/Match';
import { t as tr } from '../i18n/strings';

function roundNames(lang: 'en'|'th') { return [tr(lang, 'roundOf32'), tr(lang, 'roundOf16'), tr(lang, 'quarterfinals'), tr(lang, 'semifinals'), tr(lang, 'final')]; }

export function TournamentScreen() {
  const ctx = useContext(Ctx);
  const lang = ctx.settings.language;
  const [t, setT] = useState<TournamentState | null>(() => save.getTournament() as TournamentState | null);
  const [school, setSchool] = useState('karasawa');

  const start = () => {
    const team = buildSchoolTeam(school);
    team.isCPU = false;
    const tourney = createTournament(team, Date.now() >>> 0);
    simAllCPU(tourney, true);
    advanceRound(tourney);
    save.saveTournament({ ...tourney, ts: Date.now() });
    setT(tourney);
  };

  const playNext = () => {
    if (!t) return;
    const m = t.matches.find((x) => !x.result && x.a && x.b && (x.a.id === t.userTeamId || x.b.id === t.userTeamId));
    if (!m || !m.a || !m.b) { ctx.toast('No user match ready'); return; }
    const userIsA = m.a.id === t.userTeamId;
    ctx.nav({
      name: 'live',
      team: userIsA ? m.a : m.b,
      opponent: userIsA ? m.b : m.a,
      mode: 'tournament',
      seed: (Date.now() >>> 0),
    });
  };

  const simUser = () => {
    if (!t) return;
    const m = t.matches.find((x) => !x.result && x.a && x.b && (x.a.id === t.userTeamId || x.b.id === t.userTeamId));
    if (!m) return;
    simMatch(m, Date.now());
    simAllCPU(t, true);
    advanceRound(t);
    save.saveTournament({ ...t, ts: Date.now() });
    setT({ ...t });
  };

  if (!t) {
    return (
      <Shell title={tr(lang, 'tournament')} subtitle={tr(lang, 'roadToTitle')} onBack={ctx.back}>
        <div class="panel">
          <label class="muted">Your school</label>
          <select value={school} onChange={(e) => setSchool((e.target as HTMLSelectElement).value)}
            style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, background: '#0f2238', color: '#fff' }}>
            {['karasawa','nekoma','aoba','shiratori','inari','fukuro','date','kamome','mujina','itachi'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button class="btn primary big" data-testid="btn-start-tournament" onClick={start}>{tr(lang, 'startTournament')}</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={tr(lang, 'tournament')} onBack={ctx.back}>
      <div class="row gap wrap">
        <button class="btn primary" data-testid="btn-play-next" onClick={playNext}>{tr(lang, 'playNextMatch')}</button>
        <button class="btn" data-testid="btn-sim-match" onClick={simUser}>{tr(lang, 'simMyMatch')}</button>
        <button class="btn" onClick={() => { save.clearTournament(); setT(null); }}>Reset</button>
      </div>
      {[0, 1, 2, 3, 4].map((r) => (
        <div class="panel" key={r} style={{ marginTop: 10 }}>
          <h3>{roundNames(lang)[r]}</h3>
          {t.matches.filter((m) => m.round === r).map((m, i) => (
            <div key={i} class="row between" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{m.a?.short ?? 'TBD'} vs {m.b?.short ?? 'TBD'}</span>
              <span class="muted">{m.result ? `${m.result.setsWon[0]}-${m.result.setsWon[1]} (${m.winner?.short})` : '—'}</span>
            </div>
          ))}
        </div>
      ))}
    </Shell>
  );
}
