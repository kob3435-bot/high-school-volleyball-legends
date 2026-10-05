import { buildSchoolTeam } from '../src/engine/teamBuilder';
import { MatchSim } from '../src/engine/Match';
import { validateMatchStats } from '../src/engine/StatisticsEngine';

const a = buildSchoolTeam('karasawa');
const b = buildSchoolTeam('nekoma');
console.log('Karasawa rotation', a.rotation);
console.log('Nekoma rotation', b.rotation);
const sim = new MatchSim(a, b, 42, { bestOf: 3, keepEvents: true, userTeam: 0 });
sim.simToEnd();
const r = sim.getResult();
console.log('Result', r.setsWon, r.setScores);
console.log('MVP', r.mvpId, 'atk%', r.analysis.attackPct.map(x => x.toFixed(3)));
console.log('sideOut', r.analysis.sideOutPct.map(x => (x*100).toFixed(1)+'%'));
console.log('longest rally', r.longestRally);
console.log('validation', validateMatchStats(sim.st));
console.log('events', sim.st.events.length);
console.log('OK');
