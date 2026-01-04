import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import type { FormatId } from '../format/colorFormats';
import { formatColor, formatFunctionLabel, getFormatOptions, wrapCssFunction } from '../format/colorFormats';
import { scanDocument } from '../parser/cssScanner';
import { resolveColorAtSelection, resolveColorFromCandidate } from '../provider/colorResolution';

interface QuickPickFormatItem extends vscode.QuickPickItem {
  value: string;
  formatId: FormatId;
  useFunction: boolean;
}

const isRangeLike = (value: unknown): value is vscode.Range => {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { start?: unknown; end?: unknown };
  return Boolean(maybe.start && maybe.end);
};

const resolveEditorSelection = (
  arg?: unknown
): { editor: vscode.TextEditor | undefined; selection: vscode.Selection | undefined } => {
  let editor = vscode.window.activeTextEditor;
  let selection = editor?.selection;

  if (isRangeLike(arg)) {
    const range = arg as vscode.Range;
    selection = new vscode.Selection(range.start, range.end);
  } else if (arg && typeof arg === 'object') {
    const maybeEditor = arg as vscode.TextEditor;
    if ('document' in maybeEditor && 'selection' in maybeEditor) {
      editor = maybeEditor;
      selection = maybeEditor.selection;
    }
  }

  return { editor, selection };
};

export const runConvertColorCommand = async (
  readConfig: () => ExtensionConfig,
  arg?: unknown
): Promise<void> => {
  const { editor, selection } = resolveEditorSelection(arg);
  if (!editor) {
    vscode.window.showInformationMessage('No active editor found.');
    return;
  }

  const config = readConfig();
  if (!selection) {
    vscode.window.showInformationMessage('No selection available.');
    return;
  }

  const resolved = resolveColorAtSelection(editor.document, selection, config, {
    respectColorDirectives: false,
    respectConvertDirectives: true
  });
  if (!resolved) {
    vscode.window.showInformationMessage('No color token found at the cursor.');
    return;
  }

  const useFunction = resolved.source === 'function';
  const options = getFormatOptions(resolved.rgba).map<QuickPickFormatItem>((option) => {
    const value = useFunction ? wrapCssFunction(option.id, option.value) : option.value;
    const label = useFunction ? formatFunctionLabel(option.label) : option.label;
    return {
      label,
      detail: value,
      value,
      formatId: option.id,
      useFunction
    };
  });

  const picked = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select the output format'
  });

  if (!picked) return;

  const actions: vscode.QuickPickItem[] = [
    { label: 'Copy to Clipboard' },
    { label: 'Replace in Document' },
    { label: 'Replace All in Document' }
  ];

  const action = await vscode.window.showQuickPick(actions, {
    placeHolder: 'Choose what to do with the converted value'
  });

  if (!action) return;

  if (action.label === 'Copy to Clipboard') {
    await vscode.env.clipboard.writeText(picked.value);
    vscode.window.showInformationMessage('Converted value copied to clipboard.');
    return;
  }

  if (action.label === 'Replace in Document') {
    await editor.edit((editBuilder) => {
      editBuilder.replace(resolved.range, picked.value);
    });
    return;
  }

  const replacements = scanDocument(editor.document, config, {
    respectColorDirectives: false,
    respectConvertDirectives: true
  })
    .map((candidate) => {
      const resolvedCandidate = resolveColorFromCandidate(candidate, config);
      if (!resolvedCandidate) return null;
      const rawValue = formatColor(resolvedCandidate.rgba, picked.formatId);
      const value = picked.useFunction ? wrapCssFunction(picked.formatId, rawValue) : rawValue;
      return { range: candidate.range, value };
    })
    .filter((item): item is { range: vscode.Range; value: string } => Boolean(item));

  if (replacements.length === 0) {
    vscode.window.showInformationMessage('No color tokens found to replace.');
    return;
  }

  replacements.sort((a, b) => b.range.start.compareTo(a.range.start));
  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(replacement.range, replacement.value);
    }
  });
};
