import { NextRequest } from 'next/server';
import { BootstrapPayload, Team } from '../../types';
import { getCurrentTeamRow, publicTeamShape } from './auth';
import { mapChallenge, mapInfo, computeScoreState, buildTeamsFromRows } from './mappers';
import { getSupabaseAdmin } from './supabase';

export async function loadPublicBootstrap(request: NextRequest): Promise<BootstrapPayload> {
  const supabase = getSupabaseAdmin();

  const [eventResult, sponsorsResult, prizesResult, currentTeamRow] = await Promise.all([
    supabase.from('event_config').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('sponsors').select('*').order('sort_order', { ascending: true }),
    supabase.from('prizes').select('*').order('sort_order', { ascending: true }),
    getCurrentTeamRow(request),
  ]);

  if (eventResult.error || !eventResult.data) {
    throw new Error(eventResult.error?.message || 'Missing event_config row');
  }
  if (sponsorsResult.error) throw new Error(sponsorsResult.error.message);
  if (prizesResult.error) throw new Error(prizesResult.error.message);

  const info = mapInfo(eventResult.data, sponsorsResult.data || [], prizesResult.data || []);
  const eventStartMs = new Date(eventResult.data.start_time).getTime();
  const eventHasStarted = Number.isFinite(eventStartMs) && Date.now() >= eventStartMs;

  if (!eventHasStarted) {
    const currentUser = currentTeamRow ? buildTeamsFromRows([currentTeamRow], [])[0] || null : null;
    return {
      info,
      challenges: [],
      teams: [],
      currentUser: publicTeamShape(currentUser) as Team | null,
      challengePoints: {},
      bloodWinners: {},
    };
  }

  const [challengesResult, teamsResult, solvesResult] = await Promise.all([
    supabase.from('challenges').select('*').eq('is_published', true).order('category', { ascending: true }).order('id', { ascending: true }),
    supabase.from('teams').select('*').eq('status', 'active').order('created_at', { ascending: true }),
    supabase.from('solves').select('*').order('solved_at', { ascending: true }),
  ]);

  if (challengesResult.error) throw new Error(challengesResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (solvesResult.error) throw new Error(solvesResult.error.message);

  const challengeRows = challengesResult.data || [];
  const teamRows = teamsResult.data || [];
  const solveRows = (solvesResult.data || []).filter((solve) =>
    challengeRows.some((challenge) => challenge.id === solve.challenge_id)
  );

  const scoreState = computeScoreState(teamRows, solveRows, challengeRows);
  const challenges = challengeRows.map((row) => ({
    ...mapChallenge(row),
    solvedCount: solveRows.filter((solve) => solve.challenge_id === row.id).length,
  }));

  let currentUser: Team | null = null;
  if (currentTeamRow) {
    const currentComputed = scoreState.teams.find((team) => team.id === currentTeamRow.id);
    if (currentComputed) {
      currentUser = currentComputed;
    } else {
      currentUser = buildTeamsFromRows([currentTeamRow], solveRows)[0] || null;
    }
  }

  return {
    info,
    challenges,
    teams: scoreState.teams,
    currentUser: publicTeamShape(currentUser) as Team | null,
    challengePoints: scoreState.challengePoints,
    bloodWinners: scoreState.bloodWinners,
  };
}

export async function loadAdminState() {
  const supabase = getSupabaseAdmin();
  const [eventResult, sponsorsResult, prizesResult, challengesResult, teamsResult, solvesResult] = await Promise.all([
    supabase.from('event_config').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('sponsors').select('*').order('sort_order', { ascending: true }),
    supabase.from('prizes').select('*').order('sort_order', { ascending: true }),
    supabase.from('challenges').select('*').order('category', { ascending: true }).order('id', { ascending: true }),
    supabase.from('teams').select('*').order('created_at', { ascending: true }),
    supabase.from('solves').select('*').order('solved_at', { ascending: true }),
  ]);

  if (eventResult.error || !eventResult.data) throw new Error(eventResult.error?.message || 'Missing event_config row');
  if (sponsorsResult.error) throw new Error(sponsorsResult.error.message);
  if (prizesResult.error) throw new Error(prizesResult.error.message);
  if (challengesResult.error) throw new Error(challengesResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (solvesResult.error) throw new Error(solvesResult.error.message);

  const scoreState = computeScoreState(teamsResult.data || [], solvesResult.data || [], challengesResult.data || []);

  return {
    info: mapInfo(eventResult.data, sponsorsResult.data || [], prizesResult.data || []),
    challenges: (challengesResult.data || []).map((row) => ({
      ...mapChallenge(row, true),
      solvedCount: (solvesResult.data || []).filter((solve) => solve.challenge_id === row.id).length,
    })),
    teams: scoreState.teams,
    challengePoints: scoreState.challengePoints,
    bloodWinners: scoreState.bloodWinners,
  };
}
