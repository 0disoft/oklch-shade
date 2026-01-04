import type { ColorSpace } from '../types';
import { linearRgbToSrgb, oklabToLinearRgb } from '../conversion';
import { normalizeAlpha, normalizeOkLchC, normalizeOkLchL, toDegrees } from '../utils';

export const oklchSpace: ColorSpace = {
  id: 'oklch',
  toRgba: (parsed) => {
    const [lToken, cToken, hToken] = parsed.channels;
    if (!lToken || !cToken || !hToken) return null;

    const l = normalizeOkLchL(lToken);
    const c = normalizeOkLchC(cToken);
    const h = toDegrees(hToken);

    const rad = (h * Math.PI) / 180;
    const a = c * Math.cos(rad);
    const b = c * Math.sin(rad);

    const linear = oklabToLinearRgb(l, a, b);
    const rgb = linearRgbToSrgb(linear.r, linear.g, linear.b);

    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
