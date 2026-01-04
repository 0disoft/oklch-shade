import { clamp01 } from './utils';

export const linearToSrgb = (value: number): number => {
  if (value <= 0.0031308) return 12.92 * value;
  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
};

export const srgbToLinear = (value: number): number => {
  if (value <= 0.04045) return value / 12.92;
  return Math.pow((value + 0.055) / 1.055, 2.4);
};

export const linearRgbToSrgb = (r: number, g: number, b: number) => {
  return {
    r: clamp01(linearToSrgb(r)),
    g: clamp01(linearToSrgb(g)),
    b: clamp01(linearToSrgb(b))
  };
};

export const oklabToLinearRgb = (l: number, a: number, b: number) => {
  // Based on Bjorn Ottosson's reference implementation.
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
  };
};

export const linearRgbToOklab = (r: number, g: number, b: number) => {
  // Based on Bjorn Ottosson's reference implementation.
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
};

export const labToLinearRgb = (l: number, a: number, b: number) => {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;

  const fx3 = fx * fx * fx;
  const fz3 = fz * fz * fz;

  const xr = fx3 > epsilon ? fx3 : (116 * fx - 16) / kappa;
  const yr = l > kappa * epsilon ? Math.pow((l + 16) / 116, 3) : l / kappa;
  const zr = fz3 > epsilon ? fz3 : (116 * fz - 16) / kappa;

  const x = xr * 0.95047;
  const y = yr * 1.0;
  const z = zr * 1.08883;

  return {
    r: 3.24096994 * x - 1.53738318 * y - 0.49861076 * z,
    g: -0.96924364 * x + 1.8759675 * y + 0.04155506 * z,
    b: 0.05563008 * x - 0.20397696 * y + 1.05697151 * z
  };
};

export const linearRgbToXyz = (r: number, g: number, b: number) => {
  return {
    x: 0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    y: 0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    z: 0.0193339 * r + 0.119192 * g + 0.9503041 * b
  };
};

export const xyzToLinearRgb = (x: number, y: number, z: number) => {
  return {
    r: 3.24096994 * x - 1.53738318 * y - 0.49861076 * z,
    g: -0.96924364 * x + 1.8759675 * y + 0.04155506 * z,
    b: 0.05563008 * x - 0.20397696 * y + 1.05697151 * z
  };
};

export const linearRgbToLab = (r: number, g: number, b: number) => {
  const { x, y, z } = linearRgbToXyz(r, g, b);

  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;

  const fx = xr > epsilon ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
  const fy = yr > epsilon ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
  const fz = zr > epsilon ? Math.cbrt(zr) : (kappa * zr + 16) / 116;

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
};

export const hslToRgb = (h: number, s: number, l: number) => {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: clamp01(r + m),
    g: clamp01(g + m),
    b: clamp01(b + m)
  };
};

export const rgbToHsl = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
};

export const hwbToRgb = (h: number, w: number, b: number) => {
  const sum = w + b;
  if (sum >= 1) {
    const gray = w / sum;
    return { r: gray, g: gray, b: gray };
  }

  const base = hslToRgb(h, 1, 0.5);
  return {
    r: base.r * (1 - w - b) + w,
    g: base.g * (1 - w - b) + w,
    b: base.b * (1 - w - b) + w
  };
};

export const rgbToHwb = (r: number, g: number, b: number) => {
  const { h } = rgbToHsl(r, g, b);
  const w = Math.min(r, g, b);
  const bl = 1 - Math.max(r, g, b);
  return { h, w, b: bl };
};

export const displayP3ToLinearRgb = (r: number, g: number, b: number) => {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = 0.48657095 * rl + 0.26566769 * gl + 0.19821729 * bl;
  const y = 0.22897456 * rl + 0.69173852 * gl + 0.07928691 * bl;
  const z = 0.0 * rl + 0.04511338 * gl + 1.04394437 * bl;

  return {
    r: 3.24096994 * x - 1.53738318 * y - 0.49861076 * z,
    g: -0.96924364 * x + 1.8759675 * y + 0.04155506 * z,
    b: 0.05563008 * x - 0.20397696 * y + 1.05697151 * z
  };
};

export const linearRgbToDisplayP3 = (r: number, g: number, b: number) => {
  const { x, y, z } = linearRgbToXyz(r, g, b);
  return {
    r: 2.493496911941425 * x - 0.931383617919124 * y - 0.402710784450717 * z,
    g: -0.829488969561574 * x + 1.762664060318346 * y + 0.023624685841943 * z,
    b: 0.035845830243784 * x - 0.076172389268041 * y + 0.956884524007687 * z
  };
};

export const rgbToDisplayP3 = (r: number, g: number, b: number) => {
  const linear = {
    r: srgbToLinear(r),
    g: srgbToLinear(g),
    b: srgbToLinear(b)
  };

  const p3 = linearRgbToDisplayP3(linear.r, linear.g, linear.b);
  return {
    r: clamp01(linearToSrgb(p3.r)),
    g: clamp01(linearToSrgb(p3.g)),
    b: clamp01(linearToSrgb(p3.b))
  };
};
