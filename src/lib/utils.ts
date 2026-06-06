import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatShortName(name: string | undefined | null): string {
  if (!name) return 'Anonymous';
  let trimmed = name.trim();
  if (trimmed.includes('@')) {
    trimmed = trimmed.split('@')[0];
  }
  // Split on spaces, dots, underscores, or hyphens
  const parts = trimmed.split(/[\s\._\-]+/);
  if (parts.length === 0 || !parts[0]) return 'Anonymous';
  
  const first = parts[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function isUserOnline(user: UserProfile | undefined | null): boolean {
  if (!user) return false;
  if (user.status !== 'online') return false;
  if (!user.lastSeen) return false;
  
  let lastSeenMs: number;
  if (user.lastSeen && typeof user.lastSeen === 'object' && 'seconds' in user.lastSeen) {
    lastSeenMs = user.lastSeen.seconds * 1000;
  } else {
    lastSeenMs = new Date(user.lastSeen).getTime();
  }
  
  const nowMs = Date.now();
  // Mark online if heartbeat was within last 120 seconds (generous buffer)
  return (nowMs - lastSeenMs) < 120000;
}

export function formatLastSeen(lastSeen: any): string {
  if (!lastSeen) return 'recently';
  let date: Date;
  if (lastSeen && typeof lastSeen === 'object' && 'seconds' in lastSeen) {
    date = new Date(lastSeen.seconds * 1000);
  } else {
    date = new Date(lastSeen);
  }
  
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'just now';
  
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

