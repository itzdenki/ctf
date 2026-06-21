'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ShieldCheck, Terminal } from 'lucide-react';
import { BootstrapPayload, Challenge, CTFInfo, Team } from './types';
import { INITIAL_CTF_INFO } from './data';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import ChallengeView from './components/ChallengeView';
import ScoreboardView from './components/ScoreboardView';
import RegisterView from './components/RegisterView';
import LoginView from './components/LoginView';
import ProfileView from './components/ProfileView';
import EventNotStartedView from './components/EventNotStartedView';
import AuthRequiredView from './components/AuthRequiredView';

export default function App() {
  const [tab, setTab] = useState<string>('home');
  const [info, setInfo] = useState<CTFInfo>(INITIAL_CTF_INFO);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentUser, setCurrentUser] = useState<Team | null>(null);
  const [challengePoints, setChallengePoints] = useState<{ [challengeId: string]: number }>({});
  const [bloodWinners, setBloodWinners] = useState<BootstrapPayload['bloodWinners']>({});
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [refreshedEventStart, setRefreshedEventStart] = useState<string | null>(null);

  const loadBootstrap = useCallback(async () => {
    setBootstrapError(null);
    const response = await fetch('/api/bootstrap', {
      cache: 'no-store',
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Unable to load CTF data.');
    }

    setInfo(payload.info);
    setChallenges(payload.challenges);
    setTeams(payload.teams);
    setCurrentUser(payload.currentUser);
    setChallengePoints(payload.challengePoints || {});
    setBloodWinners(payload.bloodWinners || {});
  }, []);

  useEffect(() => {
    loadBootstrap()
      .catch((error) => setBootstrapError(error instanceof Error ? error.message : 'Unable to load CTF data.'))
      .finally(() => setIsBootstrapping(false));
  }, [loadBootstrap]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ctftimeMode = params.get('ctftime');
    const authError = params.get('authError');

    if (ctftimeMode === 'register') {
      setTab('register');
      triggerNotification('CTFtime verified. Set a password to finish registration.', 'info');
    } else if (ctftimeMode === 'login') {
      setTab('login');
      triggerNotification('CTFtime verified. Enter your team password to finish login.', 'info');
    }

    if (authError) {
      setBootstrapError(authError);
    }

    if (ctftimeMode || authError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const eventStartMs = new Date(info.startTime).getTime();
  const eventNotStarted = nowMs !== null && Number.isFinite(eventStartMs) && nowMs < eventStartMs;
  const isAuthenticated = Boolean(currentUser && !currentUser.id.startsWith('guest-') && currentUser.status !== 'banned');

  useEffect(() => {
    if (nowMs === null || !Number.isFinite(eventStartMs) || nowMs < eventStartMs || refreshedEventStart === info.startTime) {
      return;
    }

    setRefreshedEventStart(info.startTime);
    loadBootstrap().catch((error) => setBootstrapError(error instanceof Error ? error.message : 'Unable to load CTF data.'));
  }, [eventStartMs, info.startTime, loadBootstrap, nowMs, refreshedEventStart]);

  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSolveValidation = async (challengeId: string, flagSubmitted: string) => {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ challengeId, flag: flagSubmitted }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, message: result.message || 'Submit failed.' };
    }

    if (result.success) {
      await loadBootstrap();
      triggerNotification(result.message || 'Correct flag!');
    }

    return { success: Boolean(result.success), message: result.message || 'Submit processed.' };
  };

  const handleRegister = async (teamName: string, email: string, password: string, viaCtftime = false) => {
    const response = await fetch(viaCtftime ? '/api/auth/ctftime/register' : '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(viaCtftime ? { email, password } : { teamName, email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, message: result.message || 'Registration failed.' };
    }

    await loadBootstrap();
    triggerNotification(`Team ${result.teamName || teamName} joined LYKNCTF.`, 'success');
    return { success: true, message: result.message || 'Registered successfully.' };
  };

  const handleLogin = async (teamName: string, password: string, viaCtftime = false) => {
    const response = await fetch(viaCtftime ? '/api/auth/ctftime/login' : '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(viaCtftime ? { password } : { teamName, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, message: result.message || 'Login failed.' };
    }

    await loadBootstrap();
    triggerNotification(`Welcome back, ${result.teamName || teamName}.`, 'info');
    return { success: true, message: result.message || 'Logged in successfully.' };
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setCurrentUser(null);
    await loadBootstrap().catch(() => undefined);
    triggerNotification('Logged out.', 'info');
    setTab('home');
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans select-none relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.04),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.03),transparent_50%)] pointer-events-none" />

      <Navbar
        currentTab={tab}
        setTab={setTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-950/20 max-w-md w-11/12"
          >
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-400 block">Server notice</span>
              <p className="text-sm text-slate-100 font-medium leading-normal block pt-0.5">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-8">
        {isBootstrapping && (
          <div className="mb-6 rounded-sm border border-cyan-500/20 bg-[#080a0e] px-4 py-3 text-sm text-cyan-300 font-mono">
            Loading CTF data...
          </div>
        )}

        {bootstrapError && (
          <div className="mb-6 rounded-sm border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-200 font-mono flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{bootstrapError}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <HomeView info={info} currentUser={currentUser} setTab={setTab} />
            </motion.div>
          )}

          {tab === 'challenge' && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {isBootstrapping ? (
                <div className="rounded-sm border border-cyan-500/20 bg-[#080a0e] px-4 py-3 text-sm text-cyan-300 font-mono">
                  Loading CTF data...
                </div>
              ) : eventNotStarted ? (
                <EventNotStartedView startTime={info.startTime} />
              ) : !isAuthenticated ? (
                <AuthRequiredView
                  title="Challenges locked"
                  message="Login or register a team account to view challenges and submit flags."
                  setTab={setTab}
                />
              ) : (
                <ChallengeView
                  challenges={challenges}
                  currentUser={currentUser}
                  onSolveChallenge={handleSolveValidation}
                  setTab={setTab}
                  challengePoints={challengePoints}
                  bloodWinners={bloodWinners}
                  teams={teams}
                />
              )}
            </motion.div>
          )}

          {tab === 'scoreboard' && (
            <motion.div
              key="scoreboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {isBootstrapping ? (
                <div className="rounded-sm border border-cyan-500/20 bg-[#080a0e] px-4 py-3 text-sm text-cyan-300 font-mono">
                  Loading CTF data...
                </div>
              ) : eventNotStarted ? (
                <EventNotStartedView startTime={info.startTime} />
              ) : !isAuthenticated ? (
                <AuthRequiredView
                  title="Scoreboard locked"
                  message="Login or register a team account to view standings."
                  setTab={setTab}
                />
              ) : (
                <ScoreboardView teams={teams} currentUser={currentUser} challenges={challenges} />
              )}
            </motion.div>
          )}

          {tab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <RegisterView onRegister={handleRegister} setTab={setTab} />
            </motion.div>
          )}

          {tab === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <LoginView onLogin={handleLogin} setTab={setTab} />
            </motion.div>
          )}

          {tab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <ProfileView
                currentUser={currentUser}
                totalChallenges={challenges.length}
                setTab={setTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="shrink-0 border-t border-slate-950 bg-slate-950/40 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <span>&copy; 2026 LYKNCTF. All Rights Reserved.</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Server Time Indicator: <span className="text-slate-400 font-mono">UTC</span></span>
            <span className="text-emerald-400 font-bold">&#x25cf; SYSTEM ONLINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
