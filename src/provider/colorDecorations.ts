import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import type { Rgba } from '../colors/types';
import { getCustomPropertyMap, getScanCandidates } from '../parser/scanCache';
import type { ScanOptions } from '../parser/cssScanner';
import { DEFAULT_VAR_RESOLUTION_DEPTH, resolveVarCandidateValue } from '../parser/varResolver';
import { resolveColorFromCandidate } from './colorResolution';

const DECORATION_MARGIN = '0 6px 0 0';
const DECORATION_SIZE = '0.8em';
const DECORATION_BORDER = '1px solid rgba(0, 0, 0, 0.2)';
const DECORATION_DEBOUNCE_MS = 50;

const toCssColor = (rgba: Rgba): string => {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  const a = Math.max(0, Math.min(1, rgba.a));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const areBuiltInDecoratorsEnabled = (doc: vscode.TextDocument): boolean => {
  const editorSetting = vscode.workspace
    .getConfiguration('editor', doc.uri)
    .get<boolean>('colorDecorators');
  if (editorSetting === false) return false;

  const languageSetting = vscode.workspace
    .getConfiguration(doc.languageId, doc.uri)
    .get<boolean>('colorDecorators');

  return languageSetting !== false;
};

export class ColorDecorationManager {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly readConfig: () => ExtensionConfig;
  private readonly pendingUpdates = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(readConfig: () => ExtensionConfig) {
    this.readConfig = readConfig;
    this.decorationType = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: ' ',
        margin: DECORATION_MARGIN,
        width: DECORATION_SIZE,
        height: DECORATION_SIZE,
        border: DECORATION_BORDER
      }
    });
  }

  schedule(editor?: vscode.TextEditor): void {
    if (!editor) return;
    const key = editor.document.uri.toString();
    const existing = this.pendingUpdates.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const handle = setTimeout(() => {
      this.pendingUpdates.delete(key);
      this.update(editor);
    }, DECORATION_DEBOUNCE_MS);
    this.pendingUpdates.set(key, handle);
  }

  update(editor?: vscode.TextEditor): void {
    if (!editor) return;
    const config = this.readConfig();
    if (!config.languages.includes(editor.document.languageId)) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const builtInEnabled = areBuiltInDecoratorsEnabled(editor.document);
    if (builtInEnabled) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    const scanOptions: ScanOptions = {
      respectColorDirectives: true
    };
    const candidates = getScanCandidates(editor.document, config, scanOptions);
    const customPropertyMap = getCustomPropertyMap(editor.document, config, scanOptions);
    const decorations: vscode.DecorationOptions[] = [];

    for (const candidate of candidates) {
      const varResolution = resolveVarCandidateValue(
        candidate,
        customPropertyMap,
        DEFAULT_VAR_RESOLUTION_DEPTH
      );
      if (!varResolution) continue;
      if (builtInEnabled && !varResolution.viaVar) continue;

      const resolved = resolveColorFromCandidate(candidate, config, { customPropertyMap });
      if (!resolved) continue;

      const color = toCssColor(resolved.rgba);
      decorations.push({
        range: candidate.range,
        renderOptions: {
          before: {
            backgroundColor: color
          }
        }
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  clear(editor?: vscode.TextEditor): void {
    if (editor) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    for (const editorItem of vscode.window.visibleTextEditors) {
      editorItem.setDecorations(this.decorationType, []);
    }
  }

  dispose(): void {
    for (const handle of this.pendingUpdates.values()) {
      clearTimeout(handle);
    }
    this.pendingUpdates.clear();
    this.decorationType.dispose();
  }
}
