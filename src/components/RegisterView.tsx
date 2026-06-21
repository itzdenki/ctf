/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Link2, UserPlus } from 'lucide-react';

interface RegisterViewProps {
  onRegister: (teamName: string, email: string, password: string, viaCtftime?: boolean) => Promise<{ success: boolean; message: string }>;
  setTab: (tab: string) => void;
}

type CtftimePending = {
  mode: 'register' | 'login';
  teamName: string;
  ctftimeTeamId: string;
  expiresAt: string;
};

export default function RegisterView({ onRegister, setTab }: RegisterViewProps) {
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ctftimePending, setCtftimePending] = useState<CtftimePending | null>(null);
  const isCtftimeRegister = ctftimePending?.mode === 'register';

  useEffect(() => {
    fetch('/api/auth/ctftime/pending', { cache: 'no-store', credentials: 'include' })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.pending?.mode === 'register') {
          setCtftimePending(payload.pending);
          setTeamName(payload.pending.teamName || '');
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    setSuccessStatus(null);

    const trimmedTeam = teamName.trim();
    const trimmedEmail = email.trim();

    if (trimmedTeam.length < 3) {
      setErrorStatus('Team name must contain at least 3 characters.');
      return;
    }
    if (!trimmedEmail) {
      setErrorStatus('Please enter a contact email.');
      return;
    }
    if (password.length < 6) {
      setErrorStatus('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorStatus('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await onRegister(trimmedTeam, trimmedEmail, password, isCtftimeRegister);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessStatus(isCtftimeRegister ? 'CTFtime team registered. Redirecting to challenges...' : 'Team registered. Redirecting to challenges...');
      setTeamName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setTab('challenge'), 1000);
    } else {
      setErrorStatus(result.message);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="rounded-sm border border-cyan-500/20 bg-[#080a0e] p-8 relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="p-3 rounded-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <UserPlus className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="font-mono">
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Register Team</h2>
            <p className="text-gray-400 text-xs font-sans mt-2 normal-case leading-snug">
              Create a team account to submit flags and appear on the scoreboard.
            </p>
          </div>
        </div>

        <a
          href="/api/auth/ctftime/start?mode=register"
          className="mb-5 w-full flex items-center justify-center gap-2 rounded-sm border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-mono font-bold text-indigo-300 transition-colors hover:bg-indigo-500 hover:text-white"
        >
          <Link2 className="h-4 w-4" />
          REGISTER WITH CTFTIME
        </a>

        {isCtftimeRegister && (
          <div className="mb-5 p-3 rounded-sm border border-indigo-400/30 bg-indigo-500/5 text-indigo-200 text-xs font-mono">
            CTFtime verified: <span className="font-bold text-white">{ctftimePending.teamName}</span>. Enter an email and password to finish registration.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">Team Name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              readOnly={isCtftimeRegister}
              placeholder="e.g. Root_Force"
              className="w-full px-4 py-2.5 rounded-sm border border-cyan-500/20 bg-[#050608] font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors read-only:opacity-70"
            />
          </div>

          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2.5 rounded-sm border border-cyan-500/20 bg-[#050608] font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full px-4 py-2.5 rounded-sm border border-cyan-500/20 bg-[#050608] font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold text-gray-500 block uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              className="w-full px-4 py-2.5 rounded-sm border border-cyan-500/20 bg-[#050608] font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {errorStatus && (
            <div className="p-3 rounded-sm border border-rose-500/30 bg-rose-500/5 text-rose-300 text-xs flex items-start gap-2 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorStatus}</span>
            </div>
          )}

          {successStatus && (
            <div className="p-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 text-xs flex items-start gap-2 font-mono">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
              <span>{successStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 font-mono font-bold bg-cyan-600/10 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black py-3 rounded-sm transition-all cursor-pointer disabled:opacity-60 shadow-[0_0_10px_rgba(6,182,212,0.15)] text-sm"
          >
            <span>{isSubmitting ? 'CREATING...' : 'CREATE TEAM'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-cyan-500/15 text-center text-xs">
          <span className="text-gray-500 font-sans">Already registered? </span>
          <button
            onClick={() => setTab('login')}
            className="font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
