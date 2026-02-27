// src/shared/utils/date/timeAgo.ts

export function timeAgo(input: string | Date, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 5) return "agora";
  if (diffSec < 60) return `${diffSec}s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;

  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `${diffW}sem`;

  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `${diffM}mês`;

  const diffY = Math.floor(diffD / 365);
  return `${diffY}a`;
}