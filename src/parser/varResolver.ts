import type { Candidate } from './cssScanner';

export const DEFAULT_VAR_RESOLUTION_DEPTH = 5;

export type ResolvedCandidateValue = {
  valueText: string;
  propertyName: string;
  spaceHint: string | null;
  viaVar: boolean;
};

type VarExpression = {
  name: string;
  fallback?: string;
};

const stripImportant = (valueText: string): string => {
  return valueText.replace(/\s*!important\s*$/i, '').trim();
};

const parseVarExpression = (valueText: string): VarExpression | null => {
  const trimmed = stripImportant(valueText);
  const match = /^var\s*\(/i.exec(trimmed);
  if (!match) return null;

  const startIndex = trimmed.indexOf('(', match.index);
  if (startIndex === -1) return null;

  let depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1 || endIndex !== trimmed.length - 1) return null;

  const inner = trimmed.slice(startIndex + 1, endIndex).trim();
  if (!inner) return null;

  let splitIndex = -1;
  depth = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (char === ',' && depth === 0) {
      splitIndex = i;
      break;
    }
  }

  const name = (splitIndex === -1 ? inner : inner.slice(0, splitIndex)).trim();
  if (!name.startsWith('--')) return null;

  const fallback =
    splitIndex === -1 ? undefined : inner.slice(splitIndex + 1).trim() || undefined;

  return fallback ? { name, fallback } : { name };
};

export const resolveVarCandidateValue = (
  candidate: Pick<Candidate, 'valueText' | 'propertyName' | 'spaceHint'>,
  customPropertyMap: Map<string, Candidate>,
  maxDepth: number = DEFAULT_VAR_RESOLUTION_DEPTH
): ResolvedCandidateValue | null => {
  const visited = new Set<string>();

  const resolveValue = (
    input: Pick<Candidate, 'valueText' | 'propertyName' | 'spaceHint'>,
    depth: number,
    viaVar: boolean
  ): ResolvedCandidateValue | null => {
    const normalized = stripImportant(input.valueText);
    const parsed = parseVarExpression(normalized);
    if (!parsed) {
      return {
        valueText: normalized,
        propertyName: input.propertyName,
        spaceHint: input.spaceHint,
        viaVar
      };
    }

    if (depth <= 0) return null;
    if (visited.has(parsed.name)) return null;

    visited.add(parsed.name);
    const target = customPropertyMap.get(parsed.name);
    if (target) {
      const resolved = resolveValue(
        {
          valueText: target.valueText,
          propertyName: target.propertyName,
          spaceHint: target.spaceHint
        },
        depth - 1,
        true
      );
      if (resolved) {
        visited.delete(parsed.name);
        return resolved;
      }
    }

    if (parsed.fallback) {
      const resolved = resolveValue(
        {
          valueText: parsed.fallback,
          propertyName: input.propertyName,
          spaceHint: input.spaceHint
        },
        depth - 1,
        true
      );
      visited.delete(parsed.name);
      return resolved;
    }

    visited.delete(parsed.name);
    return null;
  };

  return resolveValue(candidate, maxDepth, false);
};

