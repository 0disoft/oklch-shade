import type { ColorSpace, SpaceId } from './types';
import { displayP3Space } from './spaces/p3';
import { hslSpace } from './spaces/hsl';
import { hwbSpace } from './spaces/hwb';
import { labSpace } from './spaces/lab';
import { lchSpace } from './spaces/lch';
import { oklabSpace } from './spaces/oklab';
import { oklchSpace } from './spaces/oklch';
import { rgbSpace } from './spaces/rgb';

const spaces: ColorSpace[] = [
  oklchSpace,
  oklabSpace,
  lchSpace,
  labSpace,
  rgbSpace,
  hslSpace,
  hwbSpace,
  displayP3Space
];

const registry = new Map<SpaceId, ColorSpace>(spaces.map((space) => [space.id, space]));

export const getSpace = (id: SpaceId): ColorSpace | undefined => registry.get(id);

export const isSpaceId = (value: string): value is SpaceId => {
  return registry.has(value as SpaceId);
};
