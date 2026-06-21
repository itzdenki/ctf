/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, ArrowRight, Shield, Trophy, UserCheck } from 'lucide-react';
import { Team } from '../types';

interface ProfileViewProps {
  currentUser: Team | null;
  totalChallenges: number;
  setTab: (tab: string) => void;
}

export default function ProfileView({ currentUser, totalChallenges, setTab }: ProfileViewProps) {
  if (!currentUser || currentUser.id.startsWith('guest-')) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-sm border border-cyan-500/20 bg-[#080a0e] p-8 text-center font-mono">
          <Shield className="h-10 w-10 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white uppercase">PROFILE</h2>
          <p className="mt-2 text-sm text-gray-400 font-sans">
            Vui lòng đăng nhập hoặc đăng ký đội thi để xem hồ sơ.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setTab('register')}
              className="px-4 py-2 rounded-sm bg-cyan-500 text-black text-xs font-bold uppercase"
            >
              Register
            </button>
            <button
              onClick={() => setTab('login')}
              className="px-4 py-2 rounded-sm border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const solvedCount = currentUser.solvedChallengeIds.length;
  const progress = totalChallenges > 0 ? Math.round((solvedCount / totalChallenges) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="rounded-sm border border-cyan-500/20 bg-[#080a0e] p-6 sm:p-8 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-cyan-500/15 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <UserCheck className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Team Profile</span>
              <h2 className="text-2xl font-bold text-white tracking-tight">{currentUser.name}</h2>
            </div>
          </div>

          <button
            onClick={() => setTab('challenge')}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-cyan-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-cyan-400"
          >
            Challenges
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
          <div className="rounded-sm border border-cyan-500/10 bg-[#050608] p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase">
              <Trophy className="h-4 w-4" />
              Score
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{currentUser.score} pts</p>
          </div>

          <div className="rounded-sm border border-cyan-500/10 bg-[#050608] p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase">
              <Shield className="h-4 w-4" />
              Solved
            </div>
            <p className="mt-3 text-2xl font-bold text-white">
              {solvedCount}/{totalChallenges}
            </p>
          </div>

          <div className="rounded-sm border border-cyan-500/10 bg-[#050608] p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase">
              <Activity className="h-4 w-4" />
              Progress
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{progress}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase text-gray-500">
            <span>Challenge Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm border border-cyan-500/10 bg-[#050608]">
            <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-6 border-t border-cyan-500/10 pt-4 text-xs text-gray-400">
          <span className="uppercase text-gray-500">Last solve: </span>
          <span className="text-slate-200">
            {currentUser.lastSolveTime
              ? new Date(currentUser.lastSolveTime).toLocaleString('vi-VN')
              : 'Chưa có lượt giải nào'}
          </span>
        </div>
      </div>
    </div>
  );
}
