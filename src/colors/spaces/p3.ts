import type { ColorSpace } from '../types';
import { displayP3ToLinearRgb, linearRgbToSrgb } from '../conversion';
import { normalizeAlpha, normalizeP3Channel } from '../utils';

export const displayP3Space: ColorSpace = {
  id: 'display-p3',
  toRgba: (parsed) => {
    const [rToken, gToken, bToken] = parsed.channels;
    if (!rToken || !gToken || !bToken) return null;

    const r = normalizeP3Channel(rToken);
    const g = normalizeP3Channel(gToken);
    const b = normalizeP3Channel(bToken);

    const linear = displayP3ToLinearRgb(r, g, b);
    const rgb = linearRgbToSrgb(linear.r, linear.g, linear.b);

    return {
      ...rgb,
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
