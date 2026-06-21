/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CalendarClock, LockKeyhole } from 'lucide-react';

interface EventNotStartedViewProps {
  startTime: string;
}

export default function EventNotStartedView({ startTime }: EventNotStartedViewProps) {
  const startDate = new Date(startTime);
  const formattedStart = Number.isNaN(startDate.getTime())
    ? 'Configured start time'
    : startDate.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <section className="pb-16">
      <div className="min-h-[420px] rounded-sm border border-cyan-500/20 bg-[#080a0e] cyber-grid px-6 py-16 flex items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-cyan-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-6 font-mono">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">LYKNCTF is locked</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
              Event not started yet
            </h1>
            <p className="text-sm leading-relaxed text-gray-400">
              Challenges and scoreboard will unlock when the event officially begins.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-sm border border-cyan-500/20 bg-[#050608] px-4 py-3 text-xs text-cyan-300">
            <CalendarClock className="h-4 w-4" />
            <span>{formattedStart}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
