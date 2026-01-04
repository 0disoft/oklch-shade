import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { scanDocument } from '../parser/cssScanner';
import { resolveColorFromContext } from './colorResolution';

export class InlineActionProvider implements vscode.InlayHintsProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.ProviderResult<vscode.InlayHint[]> {
    const config = this.readConfig();
    const candidates = scanDocument(document, config, {
      respectColorDirectives: false,
      respectConvertDirectives: true
    });
    const hints: vscode.InlayHint[] = [];

    for (const candidate of candidates) {
      if (!range.intersection(candidate.range)) continue;

      const resolved = resolveColorFromContext(document, candidate.range, config);
      if (!resolved) continue;

      const labelPart = new vscode.InlayHintLabelPart('Convert');
      labelPart.command = {
        command: 'oklch-shade.convertColor',
        title: 'Convert Color',
        arguments: [candidate.range]
      };
      labelPart.tooltip = 'Convert this color token';

      const hint = new vscode.InlayHint(candidate.range.end, [labelPart]);
      hint.paddingLeft = true;

      hints.push(hint);
    }

    return hints;
  }
}
