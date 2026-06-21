import { BootstrapPayload, Challenge, Team } from '../../types';

export interface ScoreboardFeedTaskStat {
  points: number;
  time: number;
}

export interface ScoreboardFeedStanding {
  pos: number;
  team: string;
  score: number;
  taskStats: Record<string, ScoreboardFeedTaskStat>;
  lastAccept: number;
}

export interface ScoreboardFeed {
  tasks: string[];
  standings: ScoreboardFeedStanding[];
}

function toUnixSeconds(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : 0;
}

function buildTaskLabels(challenges: Challenge[]) {
  const nameCounts = challenges.reduce<Record<string, number>>((acc, challenge) => {
    acc[challenge.name] = (acc[challenge.name] || 0) + 1;
    return acc;
  }, {});

  return challenges.reduce<Record<string, string>>((acc, challenge) => {
    acc[challenge.id] = nameCounts[challenge.name] > 1 ? `${challenge.name} (${challenge.id})` : challenge.name;
    return acc;
  }, {});
}

function getAwardedPoints(team: Team, challenge: Challenge, payload: BootstrapPayload) {
  const basePoints = payload.challengePoints[challenge.id] ?? challenge.points;
  const blood = payload.bloodWinners[challenge.id] || {};

  if (blood.first === team.id) {
    return basePoints + Math.round(basePoints * 0.3);
  }
  if (blood.second === team.id) {
    return basePoints + Math.round(basePoints * 0.2);
  }
  if (blood.third === team.id) {
    return basePoints + Math.round(basePoints * 0.1);
  }

  return basePoints;
}

export function buildScoreboardFeed(payload: BootstrapPayload): ScoreboardFeed {
  const challengeById = new Map(payload.challenges.map((challenge) => [challenge.id, challenge]));
  const taskLabels = buildTaskLabels(payload.challenges);

  const rows = payload.teams.map((team) => {
    const taskStats: Record<string, ScoreboardFeedTaskStat> = {};
    let score = 0;
    let lastAccept = 0;

    team.solvedChallengeIds.forEach((challengeId) => {
      const challenge = challengeById.get(challengeId);
      const taskLabel = taskLabels[challengeId];
      if (!challenge || !taskLabel) return;

      const points = getAwardedPoints(team, challenge, payload);
      const time = toUnixSeconds(team.solveTimestamps?.[challengeId]);

      taskStats[taskLabel] = { points, time };
      score += points;
      lastAccept = Math.max(lastAccept, time);
    });

    return {
      team: team.name,
      score,
      taskStats,
      lastAccept,
    };
  });

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aLast = a.lastAccept || Number.POSITIVE_INFINITY;
    const bLast = b.lastAccept || Number.POSITIVE_INFINITY;
    if (aLast !== bLast) return aLast - bLast;
    return a.team.localeCompare(b.team);
  });

  return {
    tasks: payload.challenges.map((challenge) => taskLabels[challenge.id]),
    standings: rows.map((row, index) => ({
      pos: index + 1,
      ...row,
    })),
  };
}
