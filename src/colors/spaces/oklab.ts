import type { ColorSpace } from '../types';
import { linearRgbToSrgb, oklabToLinearRgb } from '../conversion';
import { normalizeAlpha, normalizeOkLabAB, normalizeOkLabL } from '../utils';

export const oklabSpace: ColorSpace = {
  id: 'oklab',
  toRgba: (parsed) => {
    const [lToken, aToken, bToken] = parsed.channels;
    if (!lToken || !aToken || !bToken) return null;

    const l = normalizeOkLabL(lToken);
    const a = normalizeOkLabAB(aToken);
    const b = normalizeOkLabAB(bToken);

    const linear = oklabToLinearRgb(l, a, b);
    const rgb = linearRgbToSrgb(linear.r, linear.g, linear.b);

    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
