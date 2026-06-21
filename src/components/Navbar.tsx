/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Team } from '../types';

interface NavbarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  currentUser: Team | null;
  onLogout: () => void;
}

export default function Navbar({ currentTab, setTab, currentUser, onLogout }: NavbarProps) {
  const isAuthenticated = Boolean(currentUser && !currentUser.id.startsWith('guest-'));
  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'challenge', label: 'CHALLENGES' },
    { id: 'scoreboard', label: 'SCOREBOARD' },
    ...(isAuthenticated && currentUser?.isAdmin ? [{ id: 'admin', label: 'ADMIN', href: '/admin' }] : []),
    ...(isAuthenticated
      ? [{ id: 'profile', label: 'PROFILE' }]
      : [
          { id: 'register', label: 'REGISTER' },
          { id: 'login', label: 'LOGIN' },
        ]),
  ];

  const getDesktopTabClass = (tabId: string) =>
    `py-5 font-mono font-bold text-sm tracking-wide transition-all border-b-2 ${
      currentTab === tabId
        ? 'text-cyan-400 border-cyan-400'
        : 'text-gray-400 hover:text-white border-transparent'
    }`;

  const getMobileTabClass = (tabId: string) =>
    `px-3 py-1.5 rounded-sm transition-all font-bold border ${
      currentTab === tabId
        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        : 'text-gray-400 hover:text-white border-transparent'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full flex flex-col shrink-0">
      <nav className="relative h-16 border-b border-cyan-500/20 bg-[#0a0c10] flex items-center justify-center px-4 sm:px-8">
        <div className="absolute left-4 sm:left-8 flex items-center gap-3 cursor-pointer select-none" onClick={() => setTab('home')}>
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <span className="text-[#050608] font-black text-xl font-mono">Σ</span>
          </div>
          <span className="hidden xl:inline text-xl font-bold tracking-tighter text-white font-mono">
            ANTIGRAVITY<span className="text-cyan-400">_CTF</span>
          </span>
        </div>

        <div className="hidden md:flex items-center justify-center gap-6 lg:gap-8 h-full">
          {navItems.map((item) => (
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                className={getDesktopTabClass(item.id)}
              >
                {item.label}
              </a>
            ) : (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={getDesktopTabClass(item.id)}
            >
              {item.label}
            </button>
            )
          ))}

          {isAuthenticated && (
            <button
              onClick={onLogout}
              className="py-5 font-mono font-bold text-sm tracking-wide transition-all border-b-2 border-transparent text-rose-400 hover:text-rose-300"
            >
              LOGOUT
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Nav Subbar / Scroller */}
      <div className="md:hidden border-b border-cyan-500/15 bg-[#080a0e]/95 backdrop-blur-md overflow-x-auto whitespace-nowrap py-2 flex items-center px-4 scrollbar-none">
        <div className="flex items-center justify-center space-x-1 min-w-full font-mono text-[11px] uppercase tracking-wider">
          {navItems.map((item) => (
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                className={getMobileTabClass(item.id)}
              >
                {item.label}
              </a>
            ) : (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={getMobileTabClass(item.id)}
            >
              {item.label}
            </button>
            )
          ))}

          {isAuthenticated && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-sm transition-all font-bold border border-transparent text-rose-400 hover:text-rose-300"
            >
              LOGOUT
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
