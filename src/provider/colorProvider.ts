import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { getSpace, isSpaceId } from '../colors/registry';
import type { SpaceId } from '../colors/types';
import { getFormatOptions } from '../format/colorFormats';
import { scanDocument } from '../parser/cssScanner';
import { detectSpace, resolveSpaceFromRules } from '../parser/spaceDetection';
import { resolveColorFromContext } from './colorResolution';
import { parseHexColor } from '../parser/hexParser';
import { parseRawValue } from '../parser/valueParser';

const normalizeSpaceHint = (hint: string | null): SpaceId | null => {
  if (!hint) return null;
  const lowered = hint.toLowerCase();
  if (lowered === 'p3' || lowered === 'displayp3') return 'display-p3';
  if (isSpaceId(lowered)) return lowered;
  return null;
};

export class RawColorProvider implements vscode.DocumentColorProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  provideDocumentColors(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.ColorInformation[]> {
    const config = this.readConfig();
    const candidates = scanDocument(document, config);
    const colors: vscode.ColorInformation[] = [];

    const shouldShowHex = (doc: vscode.TextDocument): boolean => {
      if (config.hexPreviewMode === 'on') return true;
      if (config.hexPreviewMode === 'off') return false;

      const editorSetting = vscode.workspace
        .getConfiguration('editor', doc.uri)
        .get<boolean>('colorDecorators');
      if (editorSetting === false) return true;

      const languageSetting = vscode.workspace
        .getConfiguration(doc.languageId, doc.uri)
        .get<boolean>('colorDecorators');

      return languageSetting === false;
    };

    for (const candidate of candidates) {
      const hexColor = parseHexColor(candidate.valueText);
      if (hexColor) {
        if (!shouldShowHex(document)) continue;
        colors.push(
          new vscode.ColorInformation(
            candidate.range,
            new vscode.Color(hexColor.r, hexColor.g, hexColor.b, hexColor.a)
          )
        );
        continue;
      }

      const parsed = parseRawValue(candidate.valueText);
      if (!parsed) continue;

      const hinted = normalizeSpaceHint(candidate.spaceHint);
      const ruleSpace = resolveSpaceFromRules(candidate.propertyName, config.variableRules);
      const heuristicSpace = config.enableHeuristics
        ? detectSpace(parsed, config.ambiguousHueSpace)
        : null;

      // Hint rules override heuristics, with a final fallback to the default space.
      const spaceId = (hinted ?? ruleSpace ?? heuristicSpace ?? config.defaultSpace) as SpaceId;
      const space = getSpace(spaceId);
      if (!space) continue;

      const rgba = space.toRgba(parsed);
      if (!rgba) continue;

      colors.push(
        new vscode.ColorInformation(
          candidate.range,
          new vscode.Color(rgba.r, rgba.g, rgba.b, rgba.a)
        )
      );
    }

    return colors;
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range }
  ): vscode.ProviderResult<vscode.ColorPresentation[]> {
    const rgba = { r: color.red, g: color.green, b: color.blue, a: color.alpha };
    const config = this.readConfig();
    const resolved = resolveColorFromContext(context.document, context.range, config);
    const options = getFormatOptions(rgba);

    const preferredId =
      resolved?.source === 'hex'
        ? 'hex'
        : resolved?.spaceId === 'display-p3'
          ? 'display-p3'
          : resolved?.spaceId;

    const ordered = preferredId
      ? [...options.filter((o) => o.id === preferredId), ...options.filter((o) => o.id !== preferredId)]
      : options;

    return ordered.map((option) => {
      const presentation = new vscode.ColorPresentation(option.label);
      presentation.textEdit = new vscode.TextEdit(context.range, option.value);
      return presentation;
    });
  }
}
