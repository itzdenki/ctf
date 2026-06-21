/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Compass, Download, ExternalLink, KeyRound, Shield, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Challenge, Team } from '../types';
import SolveListModal, { getChallengeSolveRows } from './SolveListModal';

interface ChallengeViewProps {
  challenges: Challenge[];
  currentUser: Team | null;
  onSolveChallenge: (challengeId: string, flagSubmitted: string) => Promise<{ success: boolean; message: string }>;
  setTab: (tab: string) => void;
  challengePoints?: { [challengeId: string]: number };
  bloodWinners?: {
    [challengeId: string]: {
      first?: string;
      second?: string;
      third?: string;
    };
  };
  teams?: Team[];
}

export default function ChallengeView({
  challenges,
  currentUser,
  onSolveChallenge,
  setTab,
  challengePoints,
  bloodWinners,
  teams,
}: ChallengeViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solveModalChallenge, setSolveModalChallenge] = useState<Challenge | null>(null);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(challenges.map((challenge) => challenge.category)))];
  }, [challenges]);

  const filteredChallenges = selectedCategory === 'All'
    ? challenges
    : challenges.filter((challenge) => challenge.category === selectedCategory);

  const activeChallenge = challenges.find((challenge) => challenge.id === activeChallengeId) || filteredChallenges[0];
  const solvedCount = currentUser?.solvedChallengeIds.length || 0;
  const totalChallenges = challenges.length;

  const getChallengePts = (challengeId: string, fallbackPts: number) => challengePoints?.[challengeId] ?? fallbackPts;
  const isChallengeSolved = (challengeId: string) => currentUser?.solvedChallengeIds.includes(challengeId) || false;
  const getTeamName = (teamId?: string) => teams?.find((team) => team.id === teamId)?.name || null;
  const getSolveCount = (challenge: Challenge) => teams ? getChallengeSolveRows(challenge.id, teams).length : challenge.solvedCount;

  const handleSubmitFlag = async (event: React.FormEvent, challengeId: string) => {
    event.preventDefault();
    const input = flagInputs[challengeId]?.trim() || '';
    if (!input) {
      setFeedback((prev) => ({ ...prev, [challengeId]: { success: false, message: 'Please enter a flag before submitting.' } }));
      return;
    }

    setIsSubmitting(true);
    const result = await onSolveChallenge(challengeId, input);
    setIsSubmitting(false);
    setFeedback((prev) => ({ ...prev, [challengeId]: result }));

    if (result.success) {
      setFlagInputs((prev) => ({ ...prev, [challengeId]: '' }));
    }
  };

  const handleDownloadFile = async (fileName: string, challengeId: string, attachmentId: string) => {
    const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/attachment?attachmentId=${encodeURIComponent(attachmentId)}`, {
      credentials: 'include',
    });
    const payload = await response.json();
    if (response.ok && payload.url) {
      window.location.href = payload.url;
      return;
    }

    setFeedback((prev) => ({
      ...prev,
      [challengeId]: { success: false, message: payload.message || `Unable to download ${fileName}.` },
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-16 items-start">
      <div className="lg:col-span-1 space-y-6">
        <div className="p-5 rounded-sm border border-cyan-500/20 bg-[#080a0e] relative overflow-hidden">
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold tracking-wider mb-4 border-b border-cyan-500/10 pb-2">
            <Shield className="h-4 w-4" />
            <span>TEAM</span>
          </div>

          {currentUser ? (
            <div className="space-y-4">
              <div>
                <span className="text-gray-500 text-xs block font-mono">TEAM NAME</span>
                <span className="text-lg font-bold font-mono block truncate text-cyan-400 cyan-text-glow">{currentUser.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-cyan-500/10">
                <div>
                  <span className="text-gray-500 text-xs block font-mono">SCORE</span>
                  <span className="text-cyan-400 font-mono font-bold text-xl">{currentUser.score} pts</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block font-mono">SOLVED</span>
                  <span className="text-cyan-400 font-mono font-bold text-xl">{solvedCount}/{totalChallenges}</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm border border-cyan-500/10 bg-[#050608]">
                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${totalChallenges ? (solvedCount / totalChallenges) * 100 : 0}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed">Login or register a team to submit flags and save solves.</p>
              <div className="flex gap-2">
                <button onClick={() => setTab('login')} className="flex-1 rounded-sm border border-cyan-500/20 py-1.5 font-mono text-xs font-bold text-cyan-400">LOGIN</button>
                <button onClick={() => setTab('register')} className="flex-1 rounded-sm border border-cyan-500 bg-cyan-600/15 py-1.5 font-mono text-xs font-bold text-cyan-400">REGISTER</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 rounded-sm border border-cyan-500/20 bg-[#080a0e]">
          <div className="flex items-center space-x-2 text-gray-400 font-mono text-xs font-bold tracking-wider mb-4 border-b border-cyan-500/10 pb-2">
            <Compass className="h-4 w-4 text-cyan-400" />
            <span>CATEGORIES</span>
          </div>
          <div className="flex flex-wrap lg:flex-col gap-1.5 font-mono">
            {categories.map((category) => {
              const count = category === 'All' ? challenges.length : challenges.filter((challenge) => challenge.category === category).length;
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    const nextList = category === 'All' ? challenges : challenges.filter((challenge) => challenge.category === category);
                    setActiveChallengeId(nextList[0]?.id || null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-all ${
                    isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{category}</span>
                  <span className="text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-sm border border-cyan-500/20 bg-[#080a0e]">
          <div className="flex items-center space-x-2 text-gray-400 font-mono text-xs font-bold tracking-wider mb-3 border-b border-cyan-500/10 pb-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span>CHALLENGES ({filteredChallenges.length})</span>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {filteredChallenges.map((challenge) => {
              const isSelected = activeChallenge?.id === challenge.id;
              const isSolved = isChallengeSolved(challenge.id);
              return (
                <button
                  key={challenge.id}
                  onClick={() => setActiveChallengeId(challenge.id)}
                  className={`w-full text-left p-2 rounded-sm text-xs font-mono transition-all border flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-cyan-500/10 border-cyan-500/40 text-white font-semibold' : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{challenge.name}</span>
                  <span className={isSolved ? 'text-cyan-400' : 'text-gray-500'}>{getChallengePts(challenge.id, challenge.points)}p</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <AnimatePresence mode="wait">
          {activeChallenge ? (
            <motion.div
              key={activeChallenge.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-sm border border-cyan-500/20 bg-[#080a0e] overflow-hidden"
            >
              <div className="p-6 border-b border-cyan-500/15 bg-[#0a0c10] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-sm text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">{activeChallenge.category}</span>
                    <span className="text-xs text-gray-500">ID: {activeChallenge.id}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    {activeChallenge.name}
                    {isChallengeSolved(activeChallenge.id) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        <CheckCircle className="h-3 w-3" /> Solved
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex items-center space-x-3 shrink-0 font-mono">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">POINTS</span>
                    <span className="text-xl font-bold text-cyan-400">{getChallengePts(activeChallenge.id, activeChallenge.points)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSolveModalChallenge(activeChallenge)}
                    className="bg-[#050608] border border-cyan-500/10 px-3 py-1.5 rounded-sm text-xs text-left transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  >
                    <span className="text-gray-500 block text-[9px] uppercase">Solves</span>
                    <span className="text-white font-bold">{getSolveCount(activeChallenge)}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <section className="space-y-2">
                  <label className="text-xs font-mono font-bold text-gray-400 block uppercase tracking-wider">Description</label>
                  <div className="bg-[#050608] border border-cyan-500/10 p-4 rounded-sm text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">{activeChallenge.description}</div>
                </section>

                {bloodWinners?.[activeChallenge.id] && (
                  <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {(['first', 'second', 'third'] as const).map((place, index) => {
                      const teamId = bloodWinners[activeChallenge.id][place];
                      return (
                        <div key={place} className="rounded-sm border border-cyan-500/10 bg-[#050608] px-3 py-2">
                          <span className="block text-cyan-400 font-bold">{index + 1} Blood</span>
                          <span className="text-white">{getTeamName(teamId) || 'None yet'}</span>
                        </div>
                      );
                    })}
                  </section>
                )}

                {activeChallenge.connectionLink && (
                  <section className="space-y-2 font-mono">
                    <label className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Connection</label>
                    <div className="flex items-center justify-between gap-3 bg-[#0a0c10] border border-cyan-500/10 p-3 rounded-sm overflow-x-auto">
                      <code className="text-cyan-400 font-mono text-xs select-all whitespace-nowrap">{activeChallenge.connectionLink}</code>
                      <a href={activeChallenge.connectionLink} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 shrink-0 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                        <span className="text-[10px]">Open</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </section>
                )}

                {activeChallenge.attachments && activeChallenge.attachments.length > 0 && (
                  <section className="space-y-2">
                    <label className="text-xs font-mono font-bold text-gray-400 block uppercase tracking-wider">Attachments</label>
                    <div className="space-y-2">
                      {activeChallenge.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between gap-3 p-3 rounded-sm border border-cyan-500/10 bg-[#0a0c10]">
                          <div className="min-w-0 font-mono">
                            <span className="text-xs font-semibold text-gray-200 block truncate">{attachment.fileName}</span>
                            <span className="text-[10px] text-gray-500 block">{attachment.fileSize}</span>
                          </div>
                          <button
                            onClick={() => handleDownloadFile(attachment.fileName, activeChallenge.id, attachment.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 font-mono text-xs font-bold transition-all border border-cyan-500/30 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {activeChallenge.hints && activeChallenge.hints.length > 0 && (
                  <section className="space-y-2">
                    <label className="text-xs font-mono font-bold text-gray-400 block uppercase tracking-wider">Hints</label>
                    {activeChallenge.hints.map((hint, index) => (
                      <div key={index} className="text-xs bg-[#050608] border border-cyan-500/10 text-gray-400 p-3 rounded-sm flex items-start gap-2 font-mono">
                        <Shield className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>Hint {index + 1}: {hint}</span>
                      </div>
                    ))}
                  </section>
                )}

                <section className="border-t border-cyan-500/10 pt-6 space-y-4">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <KeyRound className="h-4 w-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">Submit Flag</span>
                  </div>
                  <form onSubmit={(event) => handleSubmitFlag(event, activeChallenge.id)} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={flagInputs[activeChallenge.id] || ''}
                      onChange={(event) => setFlagInputs({ ...flagInputs, [activeChallenge.id]: event.target.value })}
                      disabled={isChallengeSolved(activeChallenge.id) || isSubmitting}
                      placeholder="flag{xxxxxxxxxxxxxxxxxxxxxx}"
                      className="flex-1 px-4 py-2.5 rounded-sm border border-cyan-500/20 bg-[#050608] font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isChallengeSolved(activeChallenge.id) || isSubmitting}
                      className="px-6 py-2.5 shrink-0 rounded-sm bg-cyan-600/10 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold font-mono text-sm shadow-sm transition-all disabled:opacity-40"
                    >
                      {isChallengeSolved(activeChallenge.id) ? 'SOLVED' : isSubmitting ? 'SUBMITTING...' : 'SUBMIT FLAG'}
                    </button>
                  </form>

                  {feedback[activeChallenge.id] && (
                    <div className={`p-3.5 rounded-sm border flex items-start gap-2.5 text-sm font-mono ${
                      feedback[activeChallenge.id]!.success ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
                    }`}>
                      {feedback[activeChallenge.id]!.success ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-cyan-400" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-400" />}
                      <span>{feedback[activeChallenge.id]!.message}</span>
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-sm border border-dashed border-cyan-500/10 p-12 text-center bg-[#080a0e]/50 font-mono">
              <Terminal className="h-12 w-12 text-cyan-500/30 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No challenges are available in this category.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {solveModalChallenge && (
        <SolveListModal
          challenge={solveModalChallenge}
          teams={teams || []}
          onClose={() => setSolveModalChallenge(null)}
        />
      )}
    </div>
  );
}
