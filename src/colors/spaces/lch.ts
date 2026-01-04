import type { ColorSpace } from '../types';
import { labToLinearRgb, linearRgbToSrgb } from '../conversion';
import { normalizeAlpha, normalizeLabL, toDegrees } from '../utils';

export const lchSpace: ColorSpace = {
  id: 'lch',
  toRgba: (parsed) => {
    const [lToken, cToken, hToken] = parsed.channels;
    if (!lToken || !cToken || !hToken) return null;

    const l = normalizeLabL(lToken);
    const c = cToken.unit === '%' ? cToken.value : cToken.value;
    const h = toDegrees(hToken);

    const rad = (h * Math.PI) / 180;
    const a = c * Math.cos(rad);
    const b = c * Math.sin(rad);

    const linear = labToLinearRgb(l, a, b);
    const rgb = linearRgbToSrgb(linear.r, linear.g, linear.b);

    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
