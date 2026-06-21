/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Challenge, Team } from '../types';

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
 * Recalculates fixed scoreboard points from the admin-configured challenge values.
 * Blood winners are still tracked for display, but they do not change scores.
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

    challengePoints[ch.id] = ch.points;
  });

  // 2. Compute cumulative points for each team
  const teamsWithScores = elevatedTeams.map((team) => {
    let score = 0;

    team.solvedChallengeIds.forEach((chId) => {
      score += challengePoints[chId] || 0;
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
