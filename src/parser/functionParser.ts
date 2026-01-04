import type { SpaceId } from '../colors/types';
import { parseRawValue, type ParsedValue } from './valueParser';

export interface ParsedFunctionColor {
  spaceId: SpaceId;
  parsed: ParsedValue;
}

const parseSimpleFunction = (valueText: string): ParsedFunctionColor | null => {
  const match = /^(oklch|oklab|lch|lab|rgb|hsl|hwb)\((.+)\)$/i.exec(valueText.trim());
  if (!match) return null;

  const fn = match[1]?.toLowerCase();
  const body = match[2]?.trim() ?? '';
  if (!fn || !body) return null;

  const parsed = parseRawValue(body);
  if (!parsed) return null;

  return { spaceId: fn as SpaceId, parsed };
};

const parseDisplayP3 = (valueText: string): ParsedFunctionColor | null => {
  const match = /^color\(\s*display-p3\s+(.+)\)$/i.exec(valueText.trim());
  if (!match) return null;

  const body = match[1]?.trim() ?? '';
  if (!body) return null;

  const parsed = parseRawValue(body);
  if (!parsed) return null;

  return { spaceId: 'display-p3', parsed };
};

export const parseColorFunction = (valueText: string): ParsedFunctionColor | null => {
  return parseSimpleFunction(valueText) ?? parseDisplayP3(valueText);
};
