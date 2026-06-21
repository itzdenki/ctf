/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogIn, LockKeyhole, UserPlus } from 'lucide-react';

interface AuthRequiredViewProps {
  title: string;
  message: string;
  setTab: (tab: string) => void;
}

export default function AuthRequiredView({ title, message, setTab }: AuthRequiredViewProps) {
  return (
    <section className="pb-16">
      <div className="min-h-[420px] rounded-sm border border-cyan-500/20 bg-[#080a0e] cyber-grid px-6 py-16 flex items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-cyan-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-6 font-mono">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Team session required</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-gray-400">{message}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setTab('login')}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm bg-cyan-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-cyan-400"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm border border-cyan-500/30 bg-[#050608] px-5 py-3 text-xs font-bold uppercase tracking-wider text-cyan-300 transition-colors hover:border-cyan-400 hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
