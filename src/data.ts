/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CTFInfo } from './types';

export const INITIAL_CTF_INFO: CTFInfo = {
  name: 'Antigravity Cyber CTF 2026',
  description: 'Cyber wargame platform with challenges, scoreboard, team accounts, and organizer controls.',
  startTime: '2026-07-15T09:00:00Z',
  endTime: '2026-07-17T17:00:00Z',
  prizes: [
    {
      place: '1st Place',
      reward: '50,000,000 VND + Championship Trophy',
      icon: 'Trophy',
    },
    {
      place: '2nd Place',
      reward: '25,000,000 VND + Silver Medal',
      icon: 'Award',
    },
    {
      place: '3rd Place',
      reward: '10,000,000 VND + Bronze Medal',
      icon: 'ShieldAlert',
    },
  ],
  discordUrl: 'https://discord.gg/antigravity-ctf-demo',
  sponsors: [
    {
      id: 'fallback-sp-1',
      name: 'Google Cloud',
      linkUrl: 'https://cloud.google.com',
      description: 'Infrastructure sponsor for secure cloud workloads.',
      tier: 'Diamond',
    },
    {
      id: 'fallback-sp-2',
      name: 'Antigravity Labs',
      linkUrl: 'https://github.com',
      description: 'Security lab sponsor for challenge infrastructure.',
      tier: 'Gold',
    },
  ],
};
