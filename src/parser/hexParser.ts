export interface HexRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const expandNibble = (value: string): number => {
  return Number.parseInt(value + value, 16);
};

const toByte = (value: string): number => {
  return Number.parseInt(value, 16);
};

const toUnit = (value: number): number => value / 255;

export const parseHexColor = (raw: string): HexRgba | null => {
  const trimmed = raw.trim();
  const match = /^#([0-9a-fA-F]{3,8})$/.exec(trimmed);
  if (!match) return null;

  const hex = match[1] ?? '';

  if (hex.length === 3) {
    const r = expandNibble(hex[0]);
    const g = expandNibble(hex[1]);
    const b = expandNibble(hex[2]);
    return { r: toUnit(r), g: toUnit(g), b: toUnit(b), a: 1 };
  }

  if (hex.length === 4) {
    const r = expandNibble(hex[0]);
    const g = expandNibble(hex[1]);
    const b = expandNibble(hex[2]);
    const a = expandNibble(hex[3]);
    return { r: toUnit(r), g: toUnit(g), b: toUnit(b), a: toUnit(a) };
  }

  if (hex.length === 6) {
    const r = toByte(hex.slice(0, 2));
    const g = toByte(hex.slice(2, 4));
    const b = toByte(hex.slice(4, 6));
    return { r: toUnit(r), g: toUnit(g), b: toUnit(b), a: 1 };
  }

  if (hex.length === 8) {
    const r = toByte(hex.slice(0, 2));
    const g = toByte(hex.slice(2, 4));
    const b = toByte(hex.slice(4, 6));
    const a = toByte(hex.slice(6, 8));
    return { r: toUnit(r), g: toUnit(g), b: toUnit(b), a: toUnit(a) };
  }

  return null;
};
