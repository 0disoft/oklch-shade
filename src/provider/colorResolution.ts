import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { getSpace, isSpaceId } from '../colors/registry';
import type { Rgba, SpaceId } from '../colors/types';
import { scanDocument, type Candidate, type ScanOptions } from '../parser/cssScanner';
import { parseColorFunction } from '../parser/functionParser';
import { parseHexColor } from '../parser/hexParser';
import { detectSpace, resolveSpaceFromRules } from '../parser/spaceDetection';
import { parseRawValue } from '../parser/valueParser';

export interface ResolvedColor {
  rgba: Rgba;
  range: vscode.Range;
  spaceId?: SpaceId;
  source: 'hex' | 'raw' | 'function';
  candidate?: Candidate;
}

const normalizeSpaceHint = (hint: string | null): SpaceId | null => {
  if (!hint) return null;
  const lowered = hint.toLowerCase();
  if (lowered === 'p3' || lowered === 'displayp3') return 'display-p3';
  if (isSpaceId(lowered)) return lowered;
  return null;
};

export const resolveColorFromCandidate = (
  candidate: Candidate,
  config: ExtensionConfig
): ResolvedColor | null => {
  const hexColor = parseHexColor(candidate.valueText);
  if (hexColor) {
    return {
      rgba: hexColor,
      range: candidate.range,
      source: 'hex',
      candidate
    };
  }

  const functionColor = parseColorFunction(candidate.valueText);
  if (functionColor) {
    const space = getSpace(functionColor.spaceId);
    if (!space) return null;

    const rgba = space.toRgba(functionColor.parsed);
    if (!rgba) return null;

    return {
      rgba,
      range: candidate.range,
      spaceId: functionColor.spaceId,
      source: 'function',
      candidate
    };
  }

  const parsed = parseRawValue(candidate.valueText);
  if (!parsed) return null;

  const hinted = normalizeSpaceHint(candidate.spaceHint);
  const ruleSpace = resolveSpaceFromRules(candidate.propertyName, config.variableRules);
  const heuristicSpace = config.enableHeuristics
    ? detectSpace(parsed, config.ambiguousHueSpace)
    : null;

  const spaceId = (hinted ?? ruleSpace ?? heuristicSpace ?? config.defaultSpace) as SpaceId;
  const space = getSpace(spaceId);
  if (!space) return null;

  const rgba = space.toRgba(parsed);
  if (!rgba) return null;

  return {
    rgba,
    range: candidate.range,
    spaceId,
    source: 'raw',
    candidate
  };
};

const findCandidateForRange = (
  document: vscode.TextDocument,
  range: vscode.Range,
  config: ExtensionConfig,
  scanOptions?: ScanOptions
): Candidate | null => {
  const candidates = scanDocument(document, config, scanOptions);
  for (const candidate of candidates) {
    if (candidate.range.contains(range)) return candidate;
  }
  return null;
};

export const resolveColorAtSelection = (
  document: vscode.TextDocument,
  selection: vscode.Selection,
  config: ExtensionConfig,
  scanOptions?: ScanOptions
): ResolvedColor | null => {
  const range = selection.isEmpty ? new vscode.Range(selection.active, selection.active) : selection;
  const candidate = findCandidateForRange(document, range, config, scanOptions);
  if (candidate) return resolveColorFromCandidate(candidate, config);

  if (!selection.isEmpty) {
    const raw = document.getText(selection);
    const hexColor = parseHexColor(raw);
    if (hexColor) {
      return {
        rgba: hexColor,
        range: selection,
        source: 'hex'
      };
    }

    const functionColor = parseColorFunction(raw);
    if (functionColor) {
      const space = getSpace(functionColor.spaceId);
      if (!space) return null;

      const rgba = space.toRgba(functionColor.parsed);
      if (!rgba) return null;

      return {
        rgba,
        range: selection,
        spaceId: functionColor.spaceId,
        source: 'function'
      };
    }

    const parsed = parseRawValue(raw);
    if (!parsed) return null;

    const heuristicSpace = config.enableHeuristics
      ? detectSpace(parsed, config.ambiguousHueSpace)
      : null;

    const spaceId = (heuristicSpace ?? config.defaultSpace) as SpaceId;
    const space = getSpace(spaceId);
    if (!space) return null;

    const rgba = space.toRgba(parsed);
    if (!rgba) return null;

    return {
      rgba,
      range: selection,
      spaceId,
      source: 'raw'
    };
  }

  return null;
};

export const resolveColorAtPosition = (
  document: vscode.TextDocument,
  position: vscode.Position,
  config: ExtensionConfig,
  scanOptions?: ScanOptions
): ResolvedColor | null => {
  const selection = new vscode.Selection(position, position);
  return resolveColorAtSelection(document, selection, config, scanOptions);
};

export const resolveColorFromContext = (
  document: vscode.TextDocument,
  range: vscode.Range,
  config: ExtensionConfig,
  scanOptions?: ScanOptions
): ResolvedColor | null => {
  const candidate = findCandidateForRange(document, range, config, scanOptions);
  if (candidate) return resolveColorFromCandidate(candidate, config);

  const raw = document.getText(range);
  const hexColor = parseHexColor(raw);
  if (hexColor) {
    return {
      rgba: hexColor,
      range,
      source: 'hex'
    };
  }

  const functionColor = parseColorFunction(raw);
  if (functionColor) {
    const space = getSpace(functionColor.spaceId);
    if (!space) return null;

    const rgba = space.toRgba(functionColor.parsed);
    if (!rgba) return null;

    return {
      rgba,
      range,
      spaceId: functionColor.spaceId,
      source: 'function'
    };
  }

  const parsed = parseRawValue(raw);
  if (!parsed) return null;

  const heuristicSpace = config.enableHeuristics
    ? detectSpace(parsed, config.ambiguousHueSpace)
    : null;

  const spaceId = (heuristicSpace ?? config.defaultSpace) as SpaceId;
  const space = getSpace(spaceId);
  if (!space) return null;

  const rgba = space.toRgba(parsed);
  if (!rgba) return null;

  return {
    rgba,
    range,
    spaceId,
    source: 'raw'
  };
};
