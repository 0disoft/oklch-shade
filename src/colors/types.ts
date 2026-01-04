import type { ParsedValue } from '../parser/valueParser';

export type SpaceId =
  | 'oklch'
  | 'oklab'
  | 'lch'
  | 'lab'
  | 'rgb'
  | 'hsl'
  | 'hwb'
  | 'display-p3';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorSpace {
  id: SpaceId;
  toRgba: (parsed: ParsedValue) => Rgba | null;
}
