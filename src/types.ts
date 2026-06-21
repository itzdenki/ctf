/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  linkUrl: string;
  description: string;
  tier: 'Diamond' | 'Gold' | 'Silver';
}

export interface ChallengeAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  storagePath?: string;
  createdAt?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  category: string; // e.g. "Web", "Crypto", "Pwn", "Reverse", "Misc"
  points: number;
  connectionLink?: string; // e.g., "nc ctf.antigravity.corp 1337"
  fileName?: string; // e.g., "exploit.c", "hash_breaker.py"
  fileSize?: string;
  attachments?: ChallengeAttachment[];
  flag?: string; // Write-only in admin APIs; stored server-side as a hash.
  solvedCount: number;
  hints?: string[];
  isPublished?: boolean;
  attachmentPath?: string;
}

export interface Team {
  id: string;
  name: string;
  email?: string | null;
  score: number;
  solvedChallengeIds: string[];
  lastSolveTime?: string;
  isCurrentUser?: boolean;
  solveTimestamps?: { [challengeId: string]: string };
  status?: 'active' | 'pending' | 'banned';
  isAdmin?: boolean;
  ctftimeTeamId?: string | null;
  createdAt?: string;
}

export interface Prize {
  id?: string;
  place: string;
  reward: string;
  icon: string;
  sortOrder?: number;
}

export interface CTFInfo {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  prizes: Prize[];
  discordUrl: string;
  sponsors: Sponsor[];
}

export interface BootstrapPayload {
  info: CTFInfo;
  challenges: Challenge[];
  teams: Team[];
  currentUser: Team | null;
  challengePoints: { [challengeId: string]: number };
  bloodWinners: {
    [challengeId: string]: {
      first?: string;
      second?: string;
      third?: string;
    };
  };
}
