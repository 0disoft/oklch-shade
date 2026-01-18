import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { formatColor } from '../format/colorFormats';
import { resolveColorAtSelection, type ResolvedColor } from './colorResolution';

export class StatusBarAction {
  private readonly item: vscode.StatusBarItem;
  private readonly label = '$(symbol-color) Convert';

  constructor(private readonly readConfig: () => ExtensionConfig) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'oklch-shade.convertColor';
    this.item.text = this.label;
  }

  update(
    editor?: vscode.TextEditor,
    resolved?: ResolvedColor | null,
    configOverride?: ExtensionConfig
  ): void {
    const config = configOverride ?? this.readConfig();
    if (!config.statusBarAction) {
      this.item.hide();
      return;
    }

    if (!editor || !config.languages.includes(editor.document.languageId)) {
      this.item.hide();
      return;
    }

    const resolvedColor =
      resolved ??
      resolveColorAtSelection(editor.document, editor.selection, config, {
        respectColorDirectives: false,
        respectConvertDirectives: true
      });
    if (resolvedColor) {
      const hex = formatColor(resolvedColor.rgba, 'hex');
      this.item.tooltip = `Convert color token (${hex})`;
    } else {
      this.item.tooltip = 'Move the cursor to a color token to convert';
    }

    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
