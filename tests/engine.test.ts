import { describe, it, expect } from 'vitest';
import { MatchSim } from '../src/engine/Match';
import { buildSchoolTeam } from '../src/engine/teamBuilder';
import { validateMatchStats } from '../src/engine/StatisticsEngine';
import { validateRotation } from '../src/engine/RotationEngine';
import { canBlock, isBackRowAttacker } from '../src/engine/RotationEngine';

describe('HSVL engine', () => {
  it('completes a best-of-3 with valid stats', () => {
    const a = buildSchoolTeam('karasawa');
    const b = buildSchoolTeam('nekoma');
    const sim = new MatchSim(a, b, 12345, { bestOf: 3, keepEvents: true });
    sim.simToEnd();
    expect(sim.finished).toBe(true);
    const errs = validateMatchStats(sim.st);
    expect(errs).toEqual([]);
    const r = sim.getResult();
    expect(r.setsWon[0] + r.setsWon[1]).toBeGreaterThanOrEqual(2);
    expect(r.mvpId).toBeTruthy();
  });

  it('enforces rotation legality and no back-row block', () => {
    const a = buildSchoolTeam('date');
    const sim = new MatchSim(a, buildSchoolTeam('aoba'), 7, { bestOf: 3, keepEvents: false });
    const t = sim.st.teams[0];
    expect(validateRotation(t)).toEqual([]);
    for (const id of t.rotation) {
      const back = isBackRowAttacker(t, id);
      if (back) expect(canBlock(t, id)).toBe(false);
    }
  });

  it('survives extreme all-ace dream team', () => {
    const a = buildSchoolTeam('shiratori');
    const b = buildSchoolTeam('kamome');
    const sim = new MatchSim(a, b, 99, { bestOf: 3, keepEvents: false });
    sim.simToEnd();
    expect(sim.finished).toBe(true);
  });
});
