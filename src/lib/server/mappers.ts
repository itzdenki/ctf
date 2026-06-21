import { Challenge, ChallengeAttachment, CTFInfo, Prize, Sponsor, Team } from '../../types';
import { calculateDynamicScores } from '../../utils/scoring';

type Row = Record<string, any>;

function formatAttachmentSize(size: unknown) {
  if (typeof size === 'number') {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.ceil(size / 1024)} KB`;
  }
  return String(size || '');
}

function mapAttachments(row: Row): ChallengeAttachment[] {
  const attachmentRows = Array.isArray(row.challenge_attachments) ? row.challenge_attachments : [];
  const attachments: ChallengeAttachment[] = attachmentRows
    .map((attachment: Row) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileSize: formatAttachmentSize(attachment.file_size),
      storagePath: attachment.storage_path,
      createdAt: attachment.created_at,
    }))
    .sort((a: ChallengeAttachment, b: ChallengeAttachment) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  if (attachments.length === 0 && row.attachment_path) {
    attachments.push({
      id: 'legacy',
      fileName: row.attachment_name || 'attachment',
      fileSize: row.attachment_size || '',
      storagePath: row.attachment_path,
    });
  }

  return attachments;
}

export function mapChallenge(row: Row, includeFlag = false): Challenge {
  const attachments = mapAttachments(row);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    points: row.points,
    connectionLink: row.connection_link || undefined,
    fileName: attachments[0]?.fileName,
    fileSize: attachments[0]?.fileSize,
    attachments,
    attachmentPath: attachments[0]?.storagePath,
    flag: includeFlag ? '' : undefined,
    solvedCount: row.solved_count || 0,
    hints: row.hints || [],
    isPublished: row.is_published,
  };
}

export function mapSponsor(row: Row): Sponsor {
  return {
    id: row.id,
    name: row.name,
    linkUrl: row.link_url,
    description: row.description,
    tier: row.tier,
  };
}

export function mapPrize(row: Row): Prize {
  return {
    id: row.id,
    place: row.place,
    reward: row.reward,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

export function mapInfo(eventRow: Row, sponsors: Row[], prizes: Row[]): CTFInfo {
  return {
    name: eventRow.name,
    description: eventRow.description,
    startTime: eventRow.start_time,
    endTime: eventRow.end_time,
    discordUrl: eventRow.discord_url,
    sponsors: sponsors.map(mapSponsor),
    prizes: prizes.map(mapPrize),
  };
}

export function buildTeamsFromRows(teamRows: Row[], solveRows: Row[]): Team[] {
  return teamRows.map((team) => {
    const teamSolves = solveRows.filter((solve) => solve.team_id === team.id);
    const solveTimestamps: Record<string, string> = {};

    teamSolves.forEach((solve) => {
      solveTimestamps[solve.challenge_id] = solve.solved_at;
    });

    const lastSolveTime = teamSolves
      .map((solve) => solve.solved_at)
      .sort()
      .at(-1);

    return {
      id: team.id,
      name: team.name,
      email: team.email,
      score: 0,
      solvedChallengeIds: teamSolves.map((solve) => solve.challenge_id),
      solveTimestamps,
      lastSolveTime,
      status: team.status,
      isAdmin: Boolean(team.is_admin),
      ctftimeTeamId: team.ctftime_team_id,
      createdAt: team.created_at,
    };
  });
}

export function computeScoreState(teamRows: Row[], solveRows: Row[], challengeRows: Row[]) {
  const challenges = challengeRows.map((row) => ({
    ...mapChallenge(row),
    solvedCount: solveRows.filter((solve) => solve.challenge_id === row.id).length,
  }));
  const teams = buildTeamsFromRows(teamRows, solveRows);
  return calculateDynamicScores(teams, challenges);
}

export function formatSupabaseError(error: { message?: string } | null | undefined) {
  return error?.message || 'Database operation failed';
}
