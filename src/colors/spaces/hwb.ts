import type { ColorSpace } from '../types';
import { hwbToRgb } from '../conversion';
import { normalizeAlpha, normalizeHslPercent, toDegrees } from '../utils';

export const hwbSpace: ColorSpace = {
  id: 'hwb',
  toRgba: (parsed) => {
    const [hToken, wToken, bToken] = parsed.channels;
    if (!hToken || !wToken || !bToken) return null;

    const h = toDegrees(hToken);
    const w = normalizeHslPercent(wToken);
    const b = normalizeHslPercent(bToken);

    const rgb = hwbToRgb(h, w, b);
    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
