/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, X } from 'lucide-react';
import { Challenge, Team } from '../types';

interface SolveListModalProps {
  challenge: Challenge;
  teams: Team[];
  onClose: () => void;
}

function formatSolvedAt(value?: string) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getChallengeSolveRows(challengeId: string, teams: Team[]) {
  return teams
    .filter((team) => team.solvedChallengeIds.includes(challengeId))
    .map((team) => {
      const solvedAt = team.solveTimestamps?.[challengeId];
      const solvedAtMs = solvedAt ? new Date(solvedAt).getTime() : Number.POSITIVE_INFINITY;
      return {
        team,
        solvedAt,
        solvedAtMs: Number.isFinite(solvedAtMs) ? solvedAtMs : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => {
      if (a.solvedAtMs !== b.solvedAtMs) return a.solvedAtMs - b.solvedAtMs;
      return a.team.name.localeCompare(b.team.name);
    });
}

export default function SolveListModal({ challenge, teams, onClose }: SolveListModalProps) {
  const solveRows = getChallengeSolveRows(challenge.id, teams);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-sm border border-cyan-500/25 bg-[#080a0e] shadow-[0_0_30px_rgba(6,182,212,0.12)]">
        <div className="flex items-start justify-between gap-4 border-b border-cyan-500/15 bg-[#0a0c10] px-5 py-4">
          <div className="min-w-0 font-mono">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Solve timeline</p>
            <h2 className="truncate text-lg font-bold text-white">{challenge.name}</h2>
            <p className="text-xs text-slate-500">
              {solveRows.length} solve{solveRows.length === 1 ? '' : 's'} sorted by accepted time
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-sm border border-cyan-500/20 p-2 text-slate-400 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
            aria-label="Close solve timeline"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {solveRows.length > 0 ? (
            <div className="space-y-2">
              {solveRows.map((row, index) => (
                <div
                  key={row.team.id}
                  className="grid grid-cols-[48px_1fr] gap-3 rounded-sm border border-cyan-500/10 bg-[#050608] px-4 py-3 font-mono text-xs sm:grid-cols-[48px_1fr_220px]"
                >
                  <span className="font-bold text-cyan-400">#{index + 1}</span>
                  <span className="min-w-0 truncate font-bold text-white">{row.team.name}</span>
                  <span className="col-span-2 inline-flex items-center gap-2 text-slate-400 sm:col-span-1 sm:justify-end">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    {formatSolvedAt(row.solvedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-cyan-500/15 bg-[#050608] px-5 py-10 text-center font-mono text-sm text-slate-500">
              No team has solved this challenge yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
