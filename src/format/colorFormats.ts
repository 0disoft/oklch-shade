import type { Rgba } from '../colors/types';
import {
  linearRgbToLab,
  linearRgbToOklab,
  rgbToDisplayP3,
  rgbToHsl,
  rgbToHwb,
  srgbToLinear
} from '../colors/conversion';

export type FormatId =
  | 'oklch'
  | 'oklab'
  | 'lch'
  | 'lab'
  | 'rgb'
  | 'rgb-percent'
  | 'hsl'
  | 'hwb'
  | 'display-p3'
  | 'hex'
  | 'hex6'
  | 'hex8';

export interface FormatOption {
  id: FormatId;
  label: string;
  value: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const round = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, decimals: number): string => {
  const rounded = round(value, decimals);
  const text = rounded.toFixed(decimals);
  return text.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
};

const formatPercent = (value: number, decimals: number): string => {
  return `${formatNumber(value, decimals)}%`;
};

const hasAlpha = (alpha: number): boolean => alpha < 0.999;

const formatAlpha = (alpha: number): string => {
  if (!hasAlpha(alpha)) return '';
  return ` / ${formatNumber(clamp(alpha, 0, 1), 3)}`;
};

const formatHexAuto = (rgba: Rgba): string => {
  const toByte = (v: number) => clamp(Math.round(v * 255), 0, 255);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');

  const r = toByte(rgba.r);
  const g = toByte(rgba.g);
  const b = toByte(rgba.b);
  const a = toByte(rgba.a);

  if (hasAlpha(rgba.a)) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const formatHex6 = (rgba: Rgba): string => {
  const toByte = (v: number) => clamp(Math.round(v * 255), 0, 255);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');

  const r = toByte(rgba.r);
  const g = toByte(rgba.g);
  const b = toByte(rgba.b);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const formatHex8 = (rgba: Rgba): string => {
  const toByte = (v: number) => clamp(Math.round(v * 255), 0, 255);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');

  const r = toByte(rgba.r);
  const g = toByte(rgba.g);
  const b = toByte(rgba.b);
  const a = toByte(rgba.a);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
};

const formatRgb = (rgba: Rgba): string => {
  const r = Math.round(clamp(rgba.r, 0, 1) * 255);
  const g = Math.round(clamp(rgba.g, 0, 1) * 255);
  const b = Math.round(clamp(rgba.b, 0, 1) * 255);
  return `${r} ${g} ${b}${formatAlpha(rgba.a)}`;
};

const formatRgbPercent = (rgba: Rgba): string => {
  const r = formatPercent(clamp(rgba.r, 0, 1) * 100, 1);
  const g = formatPercent(clamp(rgba.g, 0, 1) * 100, 1);
  const b = formatPercent(clamp(rgba.b, 0, 1) * 100, 1);
  return `${r} ${g} ${b}${formatAlpha(rgba.a)}`;
};

const formatHsl = (rgba: Rgba): string => {
  const { h, s, l } = rgbToHsl(rgba.r, rgba.g, rgba.b);
  const hh = formatNumber(h, 1);
  const ss = formatPercent(s * 100, 1);
  const ll = formatPercent(l * 100, 1);
  return `${hh} ${ss} ${ll}${formatAlpha(rgba.a)}`;
};

const formatHwb = (rgba: Rgba): string => {
  const { h, w, b } = rgbToHwb(rgba.r, rgba.g, rgba.b);
  const hh = formatNumber(h, 1);
  const ww = formatPercent(w * 100, 1);
  const bb = formatPercent(b * 100, 1);
  return `${hh} ${ww} ${bb}${formatAlpha(rgba.a)}`;
};

const formatOklab = (rgba: Rgba): string => {
  const linear = {
    r: srgbToLinear(rgba.r),
    g: srgbToLinear(rgba.g),
    b: srgbToLinear(rgba.b)
  };

  const lab = linearRgbToOklab(linear.r, linear.g, linear.b);
  const l = formatPercent(lab.l * 100, 2);
  const a = formatNumber(lab.a, 4);
  const b = formatNumber(lab.b, 4);
  return `${l} ${a} ${b}${formatAlpha(rgba.a)}`;
};

const formatOklch = (rgba: Rgba): string => {
  const linear = {
    r: srgbToLinear(rgba.r),
    g: srgbToLinear(rgba.g),
    b: srgbToLinear(rgba.b)
  };

  const lab = linearRgbToOklab(linear.r, linear.g, linear.b);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (h < 0) h += 360;

  const l = formatPercent(lab.l * 100, 2);
  const cc = formatNumber(c, 4);
  const hh = formatNumber(h, 1);
  return `${l} ${cc} ${hh}${formatAlpha(rgba.a)}`;
};

const formatLab = (rgba: Rgba): string => {
  const linear = {
    r: srgbToLinear(rgba.r),
    g: srgbToLinear(rgba.g),
    b: srgbToLinear(rgba.b)
  };

  const lab = linearRgbToLab(linear.r, linear.g, linear.b);
  const l = formatNumber(lab.l, 2);
  const a = formatNumber(lab.a, 2);
  const b = formatNumber(lab.b, 2);
  return `${l} ${a} ${b}${formatAlpha(rgba.a)}`;
};

const formatLch = (rgba: Rgba): string => {
  const linear = {
    r: srgbToLinear(rgba.r),
    g: srgbToLinear(rgba.g),
    b: srgbToLinear(rgba.b)
  };

  const lab = linearRgbToLab(linear.r, linear.g, linear.b);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (h < 0) h += 360;

  const l = formatNumber(lab.l, 2);
  const cc = formatNumber(c, 2);
  const hh = formatNumber(h, 1);
  return `${l} ${cc} ${hh}${formatAlpha(rgba.a)}`;
};

const formatDisplayP3 = (rgba: Rgba): string => {
  const p3 = rgbToDisplayP3(rgba.r, rgba.g, rgba.b);
  const r = formatNumber(p3.r, 3);
  const g = formatNumber(p3.g, 3);
  const b = formatNumber(p3.b, 3);
  return `${r} ${g} ${b}${formatAlpha(rgba.a)}`;
};

export const formatColor = (rgba: Rgba, format: FormatId): string => {
  switch (format) {
    case 'hex':
      return formatHexAuto(rgba);
    case 'hex6':
      return formatHex6(rgba);
    case 'hex8':
      return formatHex8(rgba);
    case 'rgb':
      return formatRgb(rgba);
    case 'rgb-percent':
      return formatRgbPercent(rgba);
    case 'hsl':
      return formatHsl(rgba);
    case 'hwb':
      return formatHwb(rgba);
    case 'oklab':
      return formatOklab(rgba);
    case 'oklch':
      return formatOklch(rgba);
    case 'lab':
      return formatLab(rgba);
    case 'lch':
      return formatLch(rgba);
    case 'display-p3':
      return formatDisplayP3(rgba);
    default:
      return formatHexAuto(rgba);
  }
};

export const wrapCssFunction = (format: FormatId, value: string): string => {
  switch (format) {
    case 'oklch':
      return `oklch(${value})`;
    case 'oklab':
      return `oklab(${value})`;
    case 'lch':
      return `lch(${value})`;
    case 'lab':
      return `lab(${value})`;
    case 'rgb':
    case 'rgb-percent':
      return `rgb(${value})`;
    case 'hsl':
      return `hsl(${value})`;
    case 'hwb':
      return `hwb(${value})`;
    case 'display-p3':
      return `color(display-p3 ${value})`;
    case 'hex':
    case 'hex6':
    case 'hex8':
    default:
      return value;
  }
};

export const formatFunctionLabel = (label: string): string => {
  if (label.includes('(function)')) return label;
  return `${label} (function)`;
};

export const getFormatOptions = (rgba: Rgba): FormatOption[] => [
  { id: 'oklch', label: 'OKLCH', value: formatColor(rgba, 'oklch') },
  { id: 'oklab', label: 'OKLab', value: formatColor(rgba, 'oklab') },
  { id: 'lch', label: 'LCH', value: formatColor(rgba, 'lch') },
  { id: 'lab', label: 'Lab', value: formatColor(rgba, 'lab') },
  { id: 'rgb', label: 'RGB 0-255', value: formatColor(rgba, 'rgb') },
  { id: 'rgb-percent', label: 'RGB %', value: formatColor(rgba, 'rgb-percent') },
  { id: 'hsl', label: 'HSL', value: formatColor(rgba, 'hsl') },
  { id: 'hwb', label: 'HWB', value: formatColor(rgba, 'hwb') },
  { id: 'display-p3', label: 'Display P3', value: formatColor(rgba, 'display-p3') },
  { id: 'hex6', label: 'Hex #rrggbb', value: formatColor(rgba, 'hex6') },
  { id: 'hex8', label: 'Hex #rrggbbaa', value: formatColor(rgba, 'hex8') }
];
