import type { ColorSpace } from '../types';
import { labToLinearRgb, linearRgbToSrgb } from '../conversion';
import { normalizeAlpha, normalizeLabL } from '../utils';

export const labSpace: ColorSpace = {
  id: 'lab',
  toRgba: (parsed) => {
    const [lToken, aToken, bToken] = parsed.channels;
    if (!lToken || !aToken || !bToken) return null;

    const l = normalizeLabL(lToken);
    const a = aToken.value;
    const b = bToken.value;

    const linear = labToLinearRgb(l, a, b);
    const rgb = linearRgbToSrgb(linear.r, linear.g, linear.b);

    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
