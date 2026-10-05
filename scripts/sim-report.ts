/** Run 5000 matches and produce balance report. */
import { writeFileSync } from 'fs';
import { MatchSim } from '../src/engine/Match';
import { buildSchoolTeam, allStarTeam, buildDreamTeam } from '../src/engine/teamBuilder';
import { validateMatchStats } from '../src/engine/StatisticsEngine';
import { playersBySchool, allPlayers } from '../src/engine/db';
import { RNG } from '../src/engine/rng';

const N = 5000;
const schools = ['karasawa','nekoma','aoba','shiratori','inari','fukuro','date','kamome','mujina','itachi'];

interface Agg {
  matches: number; sets: number; points: number;
  setScores: number[]; matchLengths: number[];
  attackPct: number[]; acePct: number[]; serveErrPct: number[];
  receptionPct: number[]; blocksPerSet: number[]; digsPerSet: number[];
  sideOut: number[]; deuces: number; comebacks: number;
  validationErrors: number; crashes: number;
}

const agg: Agg = {
  matches: 0, sets: 0, points: 0, setScores: [], matchLengths: [],
  attackPct: [], acePct: [], serveErrPct: [], receptionPct: [],
  blocksPerSet: [], digsPerSet: [], sideOut: [],
  deuces: 0, comebacks: 0, validationErrors: 0, crashes: 0,
};

const rng = new RNG(20261005);

console.log(`Simulating ${N} matches...`);
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  try {
    const a = buildSchoolTeam(rng.pick(schools));
    const b = buildSchoolTeam(rng.pick(schools.filter((s) => s !== a.template)));
    a.isCPU = true; b.isCPU = true;
    const sim = new MatchSim(a, b, rng.int(1, 1e9), { bestOf: 5, keepEvents: false, userTeam: null });
    sim.simToEnd();
    const r = sim.getResult();
    const errs = validateMatchStats(sim.st);
    if (errs.length) agg.validationErrors++;
    agg.matches++;
    const sets = r.setScores[0].length;
    agg.sets += sets;
    agg.matchLengths.push(sets);
    for (let s = 0; s < sets; s++) {
      agg.setScores.push(r.setScores[0][s], r.setScores[1][s]);
      if (r.setScores[0][s] >= 24 && r.setScores[1][s] >= 24) agg.deuces++;
    }
    agg.points += r.teamStats[0].points + r.teamStats[1].points;
    for (const side of [0, 1] as const) {
      const ts = r.teamStats[side];
      agg.attackPct.push(r.analysis.attackPct[side]);
      agg.acePct.push(r.analysis.acePct[side]);
      agg.receptionPct.push(r.analysis.receptionPct[side]);
      agg.sideOut.push(r.analysis.sideOutPct[side]);
      const serves = Object.values(r.playerStats[side]).reduce((a, p) => a + p.serveAttempts, 0);
      agg.serveErrPct.push(serves ? ts.serveErrors / serves : 0);
      agg.blocksPerSet.push(ts.blocks / sets);
      agg.digsPerSet.push(ts.digs / sets);
    }
    // comeback: won match after losing first set
    if (r.setScores[0][0] < r.setScores[1][0] && r.winner === 0) agg.comebacks++;
    if (r.setScores[1][0] < r.setScores[0][0] && r.winner === 1) agg.comebacks++;
  } catch (e) {
    agg.crashes++;
    if (agg.crashes < 5) console.error('crash', e);
  }
  if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${N} (${Date.now() - t0}ms)`);
}

const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (n: number) => (n * 100).toFixed(1) + '%';

const report = `
HIGH SCHOOL VOLLEYBALL LEGENDS — ${N}-Match Balance Report
==========================================================
Matches: ${agg.matches}  Crashes: ${agg.crashes}  Validation errors: ${agg.validationErrors}
Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s

Average set score (points per team per set): ${avg(agg.setScores).toFixed(1)}
Average match length (sets): ${avg(agg.matchLengths).toFixed(2)}
Attack %: ${avg(agg.attackPct).toFixed(3)}
Ace %: ${pct(avg(agg.acePct))}
Serve error %: ${pct(avg(agg.serveErrPct))}
Reception %: ${pct(avg(agg.receptionPct))}
Blocks / set: ${avg(agg.blocksPerSet).toFixed(2)}
Digs / set: ${avg(agg.digsPerSet).toFixed(2)}
Side-out %: ${pct(avg(agg.sideOut))}
Deuce sets: ${agg.deuces} (${pct(agg.deuces / Math.max(1, agg.sets))})
Comebacks (lost set 1, won match): ${agg.comebacks} (${pct(agg.comebacks / agg.matches)})
`;

console.log(report);
writeFileSync('balance-report.txt', report);

// Character validation matchups
console.log('\n--- Character / Matchup Validation ---');
function matchup(aId: string, bId: string, n = 40) {
  let quickA = 0, killsA = 0, attA = 0, digsB = 0, blocksB = 0, sets = 0, rallies = 0;
  for (let i = 0; i < n; i++) {
    const a = buildSchoolTeam(aId); const b = buildSchoolTeam(bId);
    a.isCPU = true; b.isCPU = true;
    const sim = new MatchSim(a, b, 1000 + i, { bestOf: 3, keepEvents: false });
    sim.simToEnd();
    const r = sim.getResult();
    sets += r.setScores[0].length;
    for (const ps of Object.values(r.playerStats[0])) {
      quickA += ps.quickAttempts; killsA += ps.kills; attA += ps.attempts;
    }
    for (const ps of Object.values(r.playerStats[1])) {
      digsB += ps.digs; blocksB += ps.blocks;
    }
  }
  console.log(`${aId} vs ${bId} (n=${n}): quickAtt/match=${(quickA/n).toFixed(1)} kill%=${attA?(killsA/attA).toFixed(3):0} oppDigs/match=${(digsB/n).toFixed(1)} oppBlk/match=${(blocksB/n).toFixed(1)}`);
}
matchup('karasawa', 'nekoma');
matchup('karasawa', 'shiratori');
matchup('inari', 'karasawa');
matchup('fukuro', 'nekoma');
matchup('kamome', 'karasawa');

// Extreme teams
console.log('\n--- Extreme teams ---');
try {
  const aces = allPlayers().filter((p) => p.pos === 'OH' || p.pos === 'OP').sort((a,b)=>b.overall-a.overall).slice(0,6).map(p=>p.id);
  const lib = allPlayers().find((p) => p.pos === 'L')!.id;
  const dream = buildDreamTeam('All Aces', aces, lib);
  const sim = new MatchSim(dream, buildSchoolTeam('nekoma'), 99, { bestOf: 3, keepEvents: false });
  sim.simToEnd();
  console.log('All-aces team OK', sim.getResult().setsWon);
} catch (e) { console.error('extreme fail', e); }


// Star pile (high OVR, weak receive) vs balanced receive team
console.log('\n--- Star pile vs balanced receive ---');
function winRate(aTeam: () => ReturnType<typeof buildSchoolTeam>, bTeam: () => ReturnType<typeof buildSchoolTeam>, n = 80) {
  let aw = 0;
  for (let i = 0; i < n; i++) {
    const a = aTeam(); const b = bTeam();
    a.isCPU = true; b.isCPU = true;
    const sim = new MatchSim(a, b, 5000 + i, { bestOf: 3, keepEvents: false });
    sim.simToEnd();
    const r = sim.getResult();
    if (r.setsWon[0] > r.setsWon[1]) aw++;
  }
  return aw / n;
}
try {
  const stars = () => {
    // Real stars with mediocre receive + weak libero — stars favored, cats can steal
    const ids = ['oikawa', 'ushida', 'bokura', 'azuma', 'kyotani', 'haido'];
    const weakLib = allPlayers().filter((p) => p.pos === 'L')
      .sort((a, b) => a.attrs.serveReceive - b.attrs.serveReceive)[0];
    return buildDreamTeam('StarPile', ids, weakLib?.id ?? null);
  };
  const balanced = () => buildSchoolTeam('nekoma');
  const wr = winRate(stars, balanced, 100);
  const wr2 = winRate(balanced, stars, 100);
  console.log(`GlassStarPile vs Nekomo winRate=${wr.toFixed(2)} (stars favored ~0.65-0.85)`);
  console.log(`Nekomo vs GlassStarPile winRate=${wr2.toFixed(2)} (balanced can steal ~0.20+)`);
} catch (e) { console.error('starPile fail', e); }

console.log('\nDone.');
