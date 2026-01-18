import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { getSpace } from '../colors/registry';
import { normalizeSpaceHint } from '../colors/spaceHint';
import type { Rgba, SpaceId } from '../colors/types';
import type { Candidate, ScanOptions } from '../parser/cssScanner';
import { getCustomPropertyMap, getScanCandidates } from '../parser/scanCache';
import { DEFAULT_VAR_RESOLUTION_DEPTH, resolveVarCandidateValue } from '../parser/varResolver';
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

export const resolveColorFromCandidate = (
  candidate: Candidate,
  config: ExtensionConfig,
  context?: { customPropertyMap?: Map<string, Candidate> }
): ResolvedColor | null => {
  const resolved = context?.customPropertyMap
    ? resolveVarCandidateValue(
        candidate,
        context.customPropertyMap,
        DEFAULT_VAR_RESOLUTION_DEPTH
      )
    : {
        valueText: candidate.valueText,
        propertyName: candidate.propertyName,
        spaceHint: candidate.spaceHint,
        viaVar: false
      };

  if (!resolved) return null;

  const hexColor = parseHexColor(resolved.valueText);
  if (hexColor) {
    return {
      rgba: hexColor,
      range: candidate.range,
      source: 'hex',
      candidate
    };
  }

  const functionColor = parseColorFunction(resolved.valueText);
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

  const parsed = parseRawValue(resolved.valueText);
  if (!parsed) return null;

  const hinted = normalizeSpaceHint(resolved.spaceHint);
  const ruleSpace = resolveSpaceFromRules(resolved.propertyName, config.variableRules);
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
  const candidates = getScanCandidates(document, config, scanOptions);
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
  const customPropertyMap = getCustomPropertyMap(document, config, scanOptions);
  const range = selection.isEmpty ? new vscode.Range(selection.active, selection.active) : selection;
  const candidate = findCandidateForRange(document, range, config, scanOptions);
  if (candidate) {
    return resolveColorFromCandidate(candidate, config, { customPropertyMap });
  }

  if (!selection.isEmpty) {
    const syntheticCandidate: Candidate = {
      range: selection,
      valueText: document.getText(selection),
      propertyName: '',
      line: selection.start.line,
      lineText: document.lineAt(selection.start.line).text,
      spaceHint: null
    };

    return resolveColorFromCandidate(syntheticCandidate, config, {
      customPropertyMap
    });
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
  const customPropertyMap = getCustomPropertyMap(document, config, scanOptions);
  const candidate = findCandidateForRange(document, range, config, scanOptions);
  if (candidate) {
    return resolveColorFromCandidate(candidate, config, { customPropertyMap });
  }

  const syntheticCandidate: Candidate = {
    range,
    valueText: document.getText(range),
    propertyName: '',
    line: range.start.line,
    lineText: document.lineAt(range.start.line).text,
    spaceHint: null
  };

  return resolveColorFromCandidate(syntheticCandidate, config, {
    customPropertyMap
  });
};
