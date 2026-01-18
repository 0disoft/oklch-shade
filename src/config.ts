import * as vscode from 'vscode';
import type { SpaceId } from './colors/types';
import { isSpaceId } from './colors/registry';

export interface VariableRule {
  match: string;
  space: SpaceId;
}

export interface ExtensionConfig {
  languages: string[];
  scanScope: 'custom-properties' | 'all';
  defaultSpace: SpaceId;
  enableHeuristics: boolean;
  hexPreviewMode: 'auto' | 'on' | 'off';
  disableBuiltInDecorators: boolean;
  inlineAction: boolean;
  statusBarAction: boolean;
  ambiguousHueSpace: 'hsl' | 'hwb';
  variableRules: VariableRule[];
}

const fallbackConfig: ExtensionConfig = {
  languages: ['css', 'scss', 'less'],
  scanScope: 'all',
  defaultSpace: 'oklch',
  enableHeuristics: true,
  hexPreviewMode: 'auto',
  disableBuiltInDecorators: false,
  inlineAction: true,
  statusBarAction: true,
  ambiguousHueSpace: 'hsl',
  variableRules: [
    { match: 'oklch', space: 'oklch' },
    { match: 'oklab', space: 'oklab' },
    { match: 'lch', space: 'lch' },
    { match: 'lab', space: 'lab' },
    { match: 'rgb', space: 'rgb' },
    { match: 'hsl', space: 'hsl' },
    { match: 'hwb', space: 'hwb' },
    { match: 'p3', space: 'display-p3' }
  ]
};

const coerceSpaceId = (value: unknown, fallback: SpaceId): SpaceId => {
  if (typeof value === 'string' && isSpaceId(value)) return value;
  return fallback;
};

export const getConfig = (): ExtensionConfig => {
  const config = vscode.workspace.getConfiguration('oklchShade');

  const languagesRaw = config.get<unknown>('languages');
  const languages = Array.isArray(languagesRaw)
    ? languagesRaw.filter((value): value is string => typeof value === 'string')
    : fallbackConfig.languages;
  const scanScope =
    (config.get('scanScope') as ExtensionConfig['scanScope']) ?? fallbackConfig.scanScope;
  const defaultSpace = coerceSpaceId(config.get('defaultSpace'), fallbackConfig.defaultSpace);
  const enableHeuristics =
    config.get<boolean>('enableHeuristics') ?? fallbackConfig.enableHeuristics;
  const disableBuiltInDecorators =
    config.get<boolean>('disableBuiltInDecorators') ?? fallbackConfig.disableBuiltInDecorators;
  const hexPreviewModeRaw = config.get<'auto' | 'on' | 'off'>('hexPreviewMode');
  const legacyHexPreview = config.get<boolean>('enableHexPreview');
  const hexPreviewMode =
    hexPreviewModeRaw === 'on' || hexPreviewModeRaw === 'off' || hexPreviewModeRaw === 'auto'
      ? hexPreviewModeRaw
      : legacyHexPreview === true
        ? 'on'
        : legacyHexPreview === false
          ? 'off'
          : fallbackConfig.hexPreviewMode;
  const inlineAction = config.get<boolean>('inlineAction') ?? fallbackConfig.inlineAction;
  const statusBarAction = config.get<boolean>('statusBarAction') ?? fallbackConfig.statusBarAction;
  const ambiguousHueSpaceRaw = config.get<'hsl' | 'hwb'>('ambiguousHueSpace');
  const ambiguousHueSpace =
    ambiguousHueSpaceRaw === 'hwb' ? 'hwb' : fallbackConfig.ambiguousHueSpace;

  const variableRulesRaw = config.get<unknown>('variableRules');
  const variableRulesInput = Array.isArray(variableRulesRaw)
    ? variableRulesRaw
    : fallbackConfig.variableRules;
  const variableRules = variableRulesInput
    .filter((rule) => rule && typeof rule.match === 'string')
    .map((rule) => ({
      match: rule.match,
      space: coerceSpaceId(rule.space, fallbackConfig.defaultSpace)
    }));

  return {
    languages,
    scanScope,
    defaultSpace,
    enableHeuristics,
    hexPreviewMode,
    disableBuiltInDecorators,
    inlineAction,
    statusBarAction,
    ambiguousHueSpace,
    variableRules
  };
};
