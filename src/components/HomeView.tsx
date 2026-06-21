/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Trophy, Award, Gift, Clock, Sparkles, ArrowRight, Disc, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { CTFInfo, Team } from '../types';

interface HomeViewProps {
  info: CTFInfo;
  currentUser: Team | null;
  setTab: (tab: string) => void;
}

export default function HomeView({ info, currentUser, setTab }: HomeViewProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const isLoggedIn = Boolean(currentUser && !currentUser.id.startsWith('guest-'));
  const goToJoinTarget = () => setTab(isLoggedIn ? 'challenge' : 'register');

  useEffect(() => {
    const targetDate = new Date(info.startTime).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [info.startTime]);

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-12 pb-16">
      <section className="relative overflow-hidden rounded-sm border border-cyan-500/20 bg-[#080a0e] px-6 py-12 text-center cyber-grid sm:px-12 sm:py-20 shadow-[0_0_30px_rgba(6,182,212,0.05)]">
        <div className="absolute inset-0 bg-radial-at-t from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 space-y-6 max-w-4xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="h-3 w-3" /> LYKNCTF IS ONLINE
          </span>

          <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white select-none">
            {info.name.split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 cyan-text-glow">{info.name.split(' ').slice(1).join(' ')}</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-mono">
            {info.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={goToJoinTarget}
              className="group cursor-pointer font-mono font-bold flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98] text-sm"
            >
              <span>{isLoggedIn ? 'GO TO CHALLENGES' : 'REGISTER TO PLAY'}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href={info.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="cursor-pointer font-mono flex items-center space-x-2 bg-[#0a0c10] hover:bg-[#12161f] border border-cyan-500/30 text-cyan-400 px-6 py-3 rounded-sm text-sm transition-colors"
            >
              <Disc className="h-4 w-4 text-cyan-400" />
              <span>DISCORD SERVER</span>
            </a>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch font-mono">
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-sm border border-cyan-500/20 bg-[#080a0e] relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Clock className="h-5 w-5" />
              <span className="font-mono text-xs tracking-wider font-bold uppercase">EVENT COUNTDOWN</span>
            </div>
            <h3 className="text-lg font-bold font-mono tracking-tight text-white uppercase">The competition starts in</h3>
          </div>

          <div className="grid grid-cols-4 gap-3 py-6 font-mono">
            <div className="flex flex-col items-center bg-[#0a0c10] border border-cyan-500/10 p-4 rounded-sm">
              <span className="text-2xl sm:text-3xl font-bold text-white">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Days</span>
            </div>
            <div className="flex flex-col items-center bg-[#0a0c10] border border-cyan-500/10 p-4 rounded-sm">
              <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Hours</span>
            </div>
            <div className="flex flex-col items-center bg-[#0a0c10] border border-cyan-500/10 p-4 rounded-sm">
              <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Minutes</span>
            </div>
            <div className="flex flex-col items-center bg-[#0a0c10] border border-cyan-500/10 p-4 rounded-sm">
              <span className="text-2xl sm:text-3xl font-bold text-blue-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Seconds</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-cyan-500/15 pt-4 text-xs font-mono text-gray-400">
            <div className="flex justify-between gap-4">
              <span>STARTS:</span>
              <span className="text-cyan-400 font-bold text-right">{formatDate(info.startTime)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>ENDS:</span>
              <span className="text-indigo-400 font-bold text-right">{formatDate(info.endTime)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-sm border border-cyan-500/20 bg-[#080a0e] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 blur-3xl pointer-events-none" />
          <div className="space-y-4 relative z-10">
            <div className="p-3 w-fit rounded-sm bg-cyan-500/10 text-cyan-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono uppercase">
              {isLoggedIn ? 'Challenge arena' : 'Register your team'}
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-mono">
              {isLoggedIn
                ? 'Your team is ready. Head into the challenge arena when the event opens and track your progress on the scoreboard.'
                : 'Create a team account or link your CTFtime team before the event starts. Registered teams can access challenges, submit flags, and appear on the scoreboard.'}
            </p>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={goToJoinTarget}
              className="w-full flex items-center justify-center space-x-2 font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black py-3 px-4 rounded-sm transition-all cursor-pointer text-sm shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <span>{isLoggedIn ? 'OPEN CHALLENGES' : 'OPEN TEAM REGISTRATION'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-2 border-b border-cyan-500/20 pb-3">
          <Trophy className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-mono font-bold tracking-wide text-white uppercase">EVENT PRIZES</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {info.prizes.map((prize, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            return (
              <div
                key={idx}
                className={`flex flex-col p-6 rounded-sm border relative overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-[#080a0e] ${
                  isFirst
                    ? 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : isSecond
                      ? 'border-cyan-500/20'
                      : 'border-white/5'
                }`}
              >
                {isFirst && <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 blur-xl pointer-events-none" />}

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                      isFirst ? 'text-cyan-400' : isSecond ? 'text-blue-400' : 'text-gray-500'
                    }`}>
                      {prize.place}
                    </span>
                  </div>
                  <div className={`p-2 rounded-sm ${
                    isFirst
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : isSecond
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-white/5 text-gray-500'
                  }`}>
                    {idx === 0 ? <Trophy className="h-4 w-4" /> : idx === 1 ? <Award className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-white text-base font-bold font-mono tracking-tight leading-snug">
                    {prize.reward.split(' + ')[0]}
                  </p>
                  {prize.reward.split(' + ').slice(1).length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-400 list-disc list-inside font-mono">
                      {prize.reward.split(' + ').slice(1).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="discord" className="rounded-sm border border-[#5865F2]/20 bg-[#5865F2]/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-sm bg-[#5865F2]/10 text-[#5865F2]">
            <Disc className="h-6 w-6" />
          </div>
          <div className="space-y-1 font-mono">
            <h3 className="text-base font-bold text-white uppercase tracking-wide">DISCORD SERVER</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-lg normal-case font-sans">
              Join the official Discord server for announcements, event updates, infrastructure reports, and organizer support during the competition.
            </p>
          </div>
        </div>

        <a
          href={info.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="flex items-center space-x-2 shrink-0 font-mono font-bold bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2.5 rounded-sm transition-all cursor-pointer text-xs sm:text-sm"
        >
          <Disc className="h-4 w-4" />
          <span>JOIN DISCORD</span>
        </a>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-mono font-bold tracking-wide text-white uppercase">SPONSORS</h2>
          </div>
          <span className="font-mono text-xs text-gray-500">{info.sponsors.length} Sponsors</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {info.sponsors.map((sponsor) => {
            const isDiamond = sponsor.tier === 'Diamond';
            return (
              <div
                key={sponsor.id}
                className={`p-6 rounded-sm border bg-[#080a0e] flex flex-col justify-between transition-all ${
                  isDiamond
                    ? 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                    : 'border-white/5'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-mono text-white tracking-tight">{sponsor.name}</h3>
                    <span className={`px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold tracking-wider ${
                      isDiamond
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {sponsor.tier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    {sponsor.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-cyan-500/10">
                  <a
                    href={sponsor.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center space-x-1.5 font-mono text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Visit website</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
