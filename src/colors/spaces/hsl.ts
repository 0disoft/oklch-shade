import type { ColorSpace } from '../types';
import { hslToRgb } from '../conversion';
import { normalizeAlpha, normalizeHslPercent, toDegrees } from '../utils';

export const hslSpace: ColorSpace = {
  id: 'hsl',
  toRgba: (parsed) => {
    const [hToken, sToken, lToken] = parsed.channels;
    if (!hToken || !sToken || !lToken) return null;

    const h = toDegrees(hToken);
    const s = normalizeHslPercent(sToken);
    const l = normalizeHslPercent(lToken);

    const rgb = hslToRgb(h, s, l);
    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
