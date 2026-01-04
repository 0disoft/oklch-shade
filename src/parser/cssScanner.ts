import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import {
  colorDirectivePatterns,
  convertDirectivePatterns,
  extractSpaceHint,
  hasColorOff,
  hasColorOffFile,
  hasColorOn,
  isCommentOnlyLine
} from './directives';

export interface Candidate {
  range: vscode.Range;
  valueText: string;
  propertyName: string;
  line: number;
  lineText: string;
  spaceHint: string | null;
}

const supportsLineComments = (languageId: string): boolean => {
  return ['scss', 'less', 'sass'].includes(languageId);
};

// Replace comment content with spaces to keep indices stable for regex matches.
const maskComments = (text: string, allowLineComments: boolean): string => {
  const chars = Array.from(text);
  let inBlock = false;
  let inLine = false;

  for (let i = 0; i < chars.length; i += 1) {
    const current = chars[i];
    const next = chars[i + 1];

    if (inLine) {
      if (current === '\n') {
        inLine = false;
      } else {
        chars[i] = ' ';
      }
      continue;
    }

    if (inBlock) {
      if (current === '*' && next === '/') {
        chars[i] = ' ';
        chars[i + 1] = ' ';
        inBlock = false;
        i += 1;
      } else if (current !== '\n') {
        chars[i] = ' ';
      }
      continue;
    }

    if (current === '/' && next === '*') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      inBlock = true;
      i += 1;
      continue;
    }

    if (allowLineComments && current === '/' && next === '/') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      inLine = true;
      i += 1;
      continue;
    }
  }

  return chars.join('');
};

const computeLineStates = (
  document: vscode.TextDocument,
  patterns: { offFile: RegExp; off: RegExp; on: RegExp }
) => {
  const lineDisabled = new Array<boolean>(document.lineCount).fill(false);
  let fileDisabled = false;
  let blockDisabled = false;

  for (let line = 0; line < document.lineCount; line += 1) {
    const lineText = document.lineAt(line).text;

    if (patterns.offFile.test(lineText)) {
      fileDisabled = true;
    }

    const offIndex = lineText.search(patterns.off);
    const onIndex = lineText.search(patterns.on);

    // Inline `@color off` only disables the current line, while a standalone tag toggles a block.
    const inlineOff = offIndex !== -1 && lineText.slice(0, offIndex).includes(':');
    if (inlineOff) {
      lineDisabled[line] = true;
    }

    if (!inlineOff && patterns.off.test(lineText)) {
      blockDisabled = true;
    }

    if (!inlineOff && onIndex !== -1 && patterns.on.test(lineText)) {
      blockDisabled = false;
    }

    if (blockDisabled) {
      lineDisabled[line] = true;
    }
  }

  return { fileDisabled, lineDisabled };
};

export interface ScanOptions {
  respectColorDirectives?: boolean;
  respectConvertDirectives?: boolean;
}

export const scanDocument = (
  document: vscode.TextDocument,
  config: ExtensionConfig,
  options: ScanOptions = {}
): Candidate[] => {
  const respectColorDirectives = options.respectColorDirectives ?? true;
  const respectConvertDirectives = options.respectConvertDirectives ?? false;

  const colorState = respectColorDirectives
    ? computeLineStates(document, colorDirectivePatterns)
    : { fileDisabled: false, lineDisabled: new Array<boolean>(document.lineCount).fill(false) };

  const convertState = respectConvertDirectives
    ? computeLineStates(document, convertDirectivePatterns)
    : { fileDisabled: false, lineDisabled: new Array<boolean>(document.lineCount).fill(false) };

  if (respectColorDirectives && colorState.fileDisabled) return [];
  if (respectConvertDirectives && convertState.fileDisabled) return [];

  const text = document.getText();
  const scanText = maskComments(text, supportsLineComments(document.languageId));

  const pattern =
    config.scanScope === 'all'
      ? /([a-zA-Z_-][\w-]*)\s*:\s*([^;]+);/gd
      : /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/gd;

  const matches: Candidate[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(scanText))) {
    if (!match.indices || !match.indices[2]) continue;

    const propertyName = match[1] ?? '';
    const valueText = match[2] ?? '';

    const line = document.positionAt(match.index).line;
    if (respectColorDirectives && colorState.lineDisabled[line]) continue;
    if (respectConvertDirectives && convertState.lineDisabled[line]) continue;

    const valueStart = match.indices[2][0];
    const valueEnd = match.indices[2][1];

    const lineText = document.lineAt(line).text;
    // Allow `@space` on the same line or on a dedicated comment line right above.
    let spaceHint = extractSpaceHint(lineText);

    if (!spaceHint && line > 0) {
      const prevLineText = document.lineAt(line - 1).text;
      if (isCommentOnlyLine(prevLineText)) {
        spaceHint = extractSpaceHint(prevLineText);
      }
    }

    matches.push({
      range: new vscode.Range(document.positionAt(valueStart), document.positionAt(valueEnd)),
      valueText,
      propertyName,
      line,
      lineText,
      spaceHint
    });
  }

  return matches;
};
