export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);

import type { Unit } from '../parser/valueParser';

type UnitToken = { value: number; unit: Unit };

export const normalizeAlpha = (token?: UnitToken): number => {
  if (!token) return 1;
  if (token.unit === '%') return clamp01(token.value / 100);
  if (token.value > 1 && token.value <= 100) return clamp01(token.value / 100);
  return clamp01(token.value);
};

export const toDegrees = (token: UnitToken): number => {
  switch (token.unit) {
    case 'deg':
    case null:
      return token.value;
    case 'rad':
      return (token.value * 180) / Math.PI;
    case 'turn':
      return token.value * 360;
    case '%':
      return token.value * 3.6;
    default:
      return token.value;
  }
};

export const normalizeOkLchL = (token: UnitToken): number => {
  if (token.unit === '%') return token.value / 100;
  if (token.value > 1) return token.value / 100;
  return token.value;
};

export const normalizeOkLchC = (token: UnitToken): number => {
  if (token.unit === '%') return token.value / 100;
  return token.value;
};

export const normalizeOkLabL = (token: UnitToken): number => {
  if (token.unit === '%') return token.value / 100;
  if (token.value > 1) return token.value / 100;
  return token.value;
};

export const normalizeOkLabAB = (token: UnitToken): number => {
  if (token.unit === '%') return token.value / 100;
  return token.value;
};

export const normalizeLabL = (token: UnitToken): number => {
  if (token.unit === '%') return token.value;
  if (token.value <= 1) return token.value * 100;
  return token.value;
};

export const normalizeRgbChannel = (token: UnitToken): number => {
  if (token.unit === '%') return clamp01(token.value / 100);
  if (token.value > 1) return clamp01(token.value / 255);
  return clamp01(token.value);
};

export const normalizeHslPercent = (token: UnitToken): number => {
  if (token.unit === '%') return clamp01(token.value / 100);
  if (token.value > 1) return clamp01(token.value / 100);
  return clamp01(token.value);
};

export const normalizeP3Channel = (token: UnitToken): number => {
  if (token.unit === '%') return clamp01(token.value / 100);
  if (token.value > 1) return clamp01(token.value / 255);
  return clamp01(token.value);
};
