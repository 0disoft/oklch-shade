import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { formatFunctionLabel, getFormatOptions, wrapCssFunction } from '../format/colorFormats';
import { resolveColorAtPosition } from './colorResolution';

export class RawColorHoverProvider implements vscode.HoverProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const config = this.readConfig();
    const resolved = resolveColorAtPosition(document, position, config);
    if (!resolved) return null;

    const options = getFormatOptions(resolved.rgba);
    const lines = options.map((option) => {
      const value =
        resolved.source === 'function' ? wrapCssFunction(option.id, option.value) : option.value;
      const label =
        resolved.source === 'function' ? formatFunctionLabel(option.label) : option.label;
      return `- **${label}**: \`${value}\``;
    });

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    markdown.isTrusted = false;

    return new vscode.Hover(markdown, resolved.range);
  }
}
