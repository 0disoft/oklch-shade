import { isSpaceId } from './registry';
import type { SpaceId } from './types';

export const normalizeSpaceHint = (hint: string | null): SpaceId | null => {
  if (!hint) return null;
  const lowered = hint.toLowerCase();
  if (lowered === 'p3' || lowered === 'displayp3') return 'display-p3';
  if (isSpaceId(lowered)) return lowered;
  return null;
};

