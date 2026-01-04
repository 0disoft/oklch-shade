import type { ColorSpace } from '../types';
import { normalizeAlpha, normalizeRgbChannel } from '../utils';

export const rgbSpace: ColorSpace = {
  id: 'rgb',
  toRgba: (parsed) => {
    const [rToken, gToken, bToken] = parsed.channels;
    if (!rToken || !gToken || !bToken) return null;

    return {
      r: normalizeRgbChannel(rToken),
      g: normalizeRgbChannel(gToken),
      b: normalizeRgbChannel(bToken),
      a: normalizeAlpha(parsed.alpha)
    };
  }
};
