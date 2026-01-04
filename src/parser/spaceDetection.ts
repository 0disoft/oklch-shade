import type { SpaceId } from '../colors/types';
import type { ParsedValue, Token } from './valueParser';
import type { VariableRule } from '../config';

const angleUnits = new Set<Token['unit']>(['deg', 'rad', 'turn']);

export const resolveSpaceFromRules = (
  propertyName: string,
  rules: VariableRule[]
): SpaceId | null => {
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.match, 'i');
      if (regex.test(propertyName)) return rule.space;
    } catch {
      // Ignore invalid regex patterns.
    }
  }
  return null;
};

const looksLikeHue = (token: Token): boolean => {
  if (angleUnits.has(token.unit)) return true;
  if (token.unit === '%') return false;
  return token.value >= 0 && token.value <= 360 && Math.abs(token.value) > 1.5;
};

const looksLikeRgb = (tokens: Token[]): boolean => {
  if (tokens.some((t) => angleUnits.has(t.unit))) return false;
  if (tokens.some((t) => t.unit === '%')) return true;
  return tokens.some((t) => t.value > 1 && t.value <= 255);
};

// Heuristics are intentionally conservative to avoid noisy false positives.
export const detectSpace = (
  parsed: ParsedValue,
  ambiguousHueSpace: 'hsl' | 'hwb'
): SpaceId | null => {
  const [t1, t2, t3] = parsed.channels;
  if (!t1 || !t2 || !t3) return null;

  const hasNegative = parsed.channels.some((t) => t.value < 0);
  if (hasNegative) {
    const smallRange = parsed.channels.every((t) => Math.abs(t.value) <= 1);
    const t1UnitOk = t1.unit !== '%';
    if (smallRange && t1UnitOk && t1.value <= 1) return 'oklab';
    return 'lab';
  }

  const hueFirst = looksLikeHue(t1);
  const hueLast = looksLikeHue(t3);
  const t1Percent = t1.unit === '%';
  const t2Percent = t2.unit === '%';
  const t3Percent = t3.unit === '%';

  if (hueFirst && t2Percent && t3Percent) return ambiguousHueSpace;
  if (hueFirst && !t2Percent && !t3Percent && t2.value <= 1 && t3.value <= 1) {
    return ambiguousHueSpace;
  }

  if (hueLast && t1Percent && !t2Percent) return 'oklch';
  if (hueLast && !t1Percent && t1.value <= 1 && t2.value <= 1) return 'oklch';
  if (hueLast && !t2Percent && t2.value > 1) return 'lch';

  if (looksLikeRgb(parsed.channels)) return 'rgb';

  return null;
};
