/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Challenge, Team } from '../types';

/**
 * Returns the maximum and minimum point bounds for a challenge.
 */
export function getChallengeBounds(challengeId: string, basePoints: number) {
  if (challengeId === 'misc-01') {
    return { max: 100, min: 50 };
  }
  const max = Math.max(300, basePoints * 2);
  const min = 100;
  return { max, min };
}

/**
 * Computes the dynamic points of a challenge based on how many teams solved it.
 * Highly aligned with CTFd / rCTF formulas.
 */
export function getChallengeDynamicPoints(
  challengeId: string,
  basePoints: number,
  solveCount: number,
  totalTeams: number
): number {
  const { max, min } = getChallengeBounds(challengeId, basePoints);
  if (solveCount <= 1) {
    return max;
  }
  // Decay limit scales with local team count, minimum of 5 teams
  const decayLimit = Math.max(5, Math.ceil(totalTeams * 0.7));
  if (decayLimit <= 1) {
    return min;
  }
  const ratio = Math.min(1, (solveCount - 1) / (decayLimit - 1));
  return Math.round(max - (max - min) * ratio);
}

/**
 * Enriches pre-loaded teams with deterministic, realistic historical solve timestamps
 * if they don't have them in persisted solve data yet.
 */
export function enrichTeamSolveTimestamps(teams: Team[]): Team[] {
  return teams.map((team) => {
    if (team.solveTimestamps && Object.keys(team.solveTimestamps).length > 0) {
      return team;
    }

    const solveTimestamps: { [challengeId: string]: string } = {};
    const count = team.solvedChallengeIds.length;
    if (count > 0) {
      const lastTime = team.lastSolveTime
        ? new Date(team.lastSolveTime).getTime()
        : Date.now();
      
      // Space solves backwards from their last solve time (e.g. 2 hours each)
      team.solvedChallengeIds.forEach((chId, idx) => {
        const timeOffset = (count - 1 - idx) * 2 * 60 * 60 * 1000;
        const solvedDate = new Date(lastTime - timeOffset);
        solveTimestamps[chId] = solvedDate.toISOString();
      });
    }

    return {
      ...team,
      solveTimestamps,
    };
  });
}

/**
 * Recalculates the dynamic scores and first/second/third blood bonuses
 * for all teams globally based on their solved challenges and timestamps.
 * 
 * Bonuses:
 * - 1st blood: +30% of current dynamic points
 * - 2nd blood: +20% of current dynamic points
 * - 3rd blood: +10% of current dynamic points
 */
export function calculateDynamicScores(
  rawTeams: Team[],
  challenges: Challenge[]
): {
  teams: Team[];
  challengePoints: { [challengeId: string]: number };
  bloodWinners: {
    [challengeId: string]: {
      first?: string; // teamId
      second?: string; // teamId
      third?: string; // teamId
    };
  };
} {
  // First, ensure all teams have valid timestamps
  const elevatedTeams = enrichTeamSolveTimestamps(rawTeams);

  // 1. Calculate how many teams solved each challenge
  const challengeSolversConfig: { [challengeId: string]: { teamId: string; time: number }[] } = {};
  challenges.forEach((ch) => {
    challengeSolversConfig[ch.id] = [];
  });

  elevatedTeams.forEach((team) => {
    team.solvedChallengeIds.forEach((chId) => {
      const timestamps = team.solveTimestamps || {};
      const timeStr = timestamps[chId];
      const timeMs = timeStr ? new Date(timeStr).getTime() : Date.now();
      if (!challengeSolversConfig[chId]) {
        challengeSolversConfig[chId] = [];
      }
      challengeSolversConfig[chId].push({ teamId: team.id, time: timeMs });
    });
  });

  // Sort solvers for each challenge historically to identify first bloods
  const bloodWinners: {
    [challengeId: string]: { first?: string; second?: string; third?: string };
  } = {};

  const challengePoints: { [challengeId: string]: number } = {};

  challenges.forEach((ch) => {
    const solvers = challengeSolversConfig[ch.id] || [];
    // Sort ascending by time
    solvers.sort((a, b) => a.time - b.time);

    // Save blood winners
    bloodWinners[ch.id] = {
      first: solvers[0]?.teamId,
      second: solvers[1]?.teamId,
      third: solvers[2]?.teamId,
    };

    // Calculate dynamic points of this challenge using count of active players who solved
    challengePoints[ch.id] = getChallengeDynamicPoints(
      ch.id,
      ch.points,
      solvers.length,
      elevatedTeams.length
    );
  });

  // 2. Compute cumulative points for each team
  const teamsWithScores = elevatedTeams.map((team) => {
    let score = 0;

    team.solvedChallengeIds.forEach((chId) => {
      const dynamicVal = challengePoints[chId] || 0;
      score += dynamicVal;

      // Add blood bonus if applicable
      const bloods = bloodWinners[chId] || {};
      if (bloods.first === team.id) {
        score += Math.round(dynamicVal * 0.3); // +30%
      } else if (bloods.second === team.id) {
        score += Math.round(dynamicVal * 0.2); // +20%
      } else if (bloods.third === team.id) {
        score += Math.round(dynamicVal * 0.1); // +10%
      }
    });

    return {
      ...team,
      score,
    };
  });

  return {
    teams: teamsWithScores,
    challengePoints,
    bloodWinners,
  };
}
