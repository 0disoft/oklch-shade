import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { getSpace } from '../colors/registry';
import { normalizeSpaceHint } from '../colors/spaceHint';
import type { SpaceId } from '../colors/types';
import { getFormatOptions } from '../format/colorFormats';
import { getCustomPropertyMap, getScanCandidates } from '../parser/scanCache';
import { DEFAULT_VAR_RESOLUTION_DEPTH, resolveVarCandidateValue } from '../parser/varResolver';
import { parseColorFunction } from '../parser/functionParser';
import { detectSpace, resolveSpaceFromRules } from '../parser/spaceDetection';
import { resolveColorFromContext } from './colorResolution';
import { parseHexColor } from '../parser/hexParser';
import { parseRawValue } from '../parser/valueParser';

function areBuiltInDecoratorsEnabled(doc: vscode.TextDocument): boolean {
  const editorSetting = vscode.workspace
    .getConfiguration('editor', doc.uri)
    .get<boolean>('colorDecorators');
  if (editorSetting === false) return false;

  const languageSetting = vscode.workspace
    .getConfiguration(doc.languageId, doc.uri)
    .get<boolean>('colorDecorators');

  return languageSetting !== false;
}

export class RawColorProvider implements vscode.DocumentColorProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  provideDocumentColors(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.ColorInformation[]> {
    const config = this.readConfig();
    const candidates = getScanCandidates(document, config);
    const customPropertyMap = getCustomPropertyMap(document, config);
    const colors: vscode.ColorInformation[] = [];
    const builtInEnabled = areBuiltInDecoratorsEnabled(document);

    const shouldShowHex = (doc: vscode.TextDocument): boolean => {
      if (config.hexPreviewMode === 'on') return true;
      if (config.hexPreviewMode === 'off') return false;
      return !areBuiltInDecoratorsEnabled(doc);
    };

    for (const candidate of candidates) {
      const resolved = resolveVarCandidateValue(
        candidate,
        customPropertyMap,
        DEFAULT_VAR_RESOLUTION_DEPTH
      );
      if (!resolved) continue;

      const hexColor = parseHexColor(resolved.valueText);
      if (hexColor) {
        if (!resolved.viaVar && !shouldShowHex(document)) continue;
        colors.push(
          new vscode.ColorInformation(
            candidate.range,
            new vscode.Color(hexColor.r, hexColor.g, hexColor.b, hexColor.a)
          )
        );
        continue;
      }

      const functionColor = parseColorFunction(resolved.valueText);
      if (functionColor) {
        if (!resolved.viaVar && builtInEnabled && functionColor.spaceId !== 'display-p3') {
          continue;
        }
        const space = getSpace(functionColor.spaceId);
        if (!space) continue;
        const rgba = space.toRgba(functionColor.parsed);
        if (!rgba) continue;
        colors.push(
          new vscode.ColorInformation(
            candidate.range,
            new vscode.Color(rgba.r, rgba.g, rgba.b, rgba.a)
          )
        );
        continue;
      }

      const parsed = parseRawValue(resolved.valueText);
      if (!parsed) continue;

      const hinted = normalizeSpaceHint(resolved.spaceHint);
      const ruleSpace = resolveSpaceFromRules(resolved.propertyName, config.variableRules);
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
