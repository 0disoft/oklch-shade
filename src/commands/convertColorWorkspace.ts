import * as path from 'path';
import * as vscode from 'vscode';
import type { Rgba } from '../colors/types';
import type { ExtensionConfig } from '../config';
import { formatColor, getFormatOptions, wrapCssFunction, type FormatId } from '../format/colorFormats';
import { getCustomPropertyMap, getScanCandidates } from '../parser/scanCache';
import { resolveColorFromCandidate } from '../provider/colorResolution';

interface ScopePickItem extends vscode.QuickPickItem {
  scope: 'current' | 'folder' | 'workspace';
}

interface FormatPickItem extends vscode.QuickPickItem {
  formatId: FormatId;
}

const SAMPLE_RGBA: Rgba = { r: 0.35, g: 0.5, b: 0.65, a: 1 };

const languageExtensions: Record<string, string[]> = {
  css: ['css'],
  scss: ['scss'],
  less: ['less'],
  sass: ['sass'],
  postcss: ['pcss', 'postcss'],
  stylus: ['styl'],
  styl: ['styl']
};

const EXCLUDED_WORKSPACE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/out/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vscode-test/**'
] as const;

const buildSearchPattern = (languages: string[]): string => {
  const extensions = new Set<string>();
  for (const language of languages) {
    const mapped = languageExtensions[language];
    if (mapped) {
      mapped.forEach((ext) => extensions.add(ext));
      continue;
    }
    if (/^[a-z0-9]+$/i.test(language)) {
      extensions.add(language);
    }
  }

  if (extensions.size === 0) {
    ['css', 'scss', 'less'].forEach((ext) => extensions.add(ext));
  }

  const list = Array.from(extensions.values());
  if (list.length === 1) return `**/*.${list[0]}`;
  return `**/*.{${list.join(',')}}`;
};

const isUri = (value: unknown): value is vscode.Uri => {
  if (!value || typeof value !== 'object') return false;
  return 'fsPath' in (value as { fsPath?: unknown });
};

const normalizeUris = (value: unknown): vscode.Uri[] => {
  if (isUri(value)) return [value];
  if (Array.isArray(value) && value.every(isUri)) return value;
  return [];
};

const splitUris = async (
  uris: vscode.Uri[]
): Promise<{ files: vscode.Uri[]; folders: vscode.Uri[] }> => {
  const files: vscode.Uri[] = [];
  const folders: vscode.Uri[] = [];

  for (const uri of uris) {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type & vscode.FileType.Directory) {
      folders.push(uri);
    } else {
      files.push(uri);
    }
  }

  return { files, folders };
};

const uniqueUris = (uris: vscode.Uri[]): vscode.Uri[] => {
  const unique = new Map<string, vscode.Uri>();
  for (const uri of uris) {
    unique.set(uri.fsPath, uri);
  }
  return Array.from(unique.values());
};

const pickScope = async (editor?: vscode.TextEditor): Promise<ScopePickItem | undefined> => {
  const items: ScopePickItem[] = [];

  if (editor) {
    items.push({
      label: 'Current file',
      description: path.basename(editor.document.uri.fsPath),
      scope: 'current'
    });
  }

  items.push({
    label: 'Folder...',
    description: 'Pick a folder to convert',
    scope: 'folder'
  });

  items.push({
    label: 'Workspace',
    description: 'All workspace folders',
    scope: 'workspace'
  });

  return vscode.window.showQuickPick(items, {
    placeHolder: 'Choose a conversion scope'
  });
};

const pickFormat = async (): Promise<FormatPickItem | undefined> => {
  const options = getFormatOptions(SAMPLE_RGBA).map<FormatPickItem>((option) => ({
    label: option.label,
    description: 'Preserve raw/function style',
    detail: option.value,
    formatId: option.id
  }));

  return vscode.window.showQuickPick(options, {
    placeHolder: 'Select the output format'
  });
};

const collectFiles = async (roots: string[], config: ExtensionConfig): Promise<vscode.Uri[]> => {
  const pattern = buildSearchPattern(config.languages);
  const results: vscode.Uri[] = [];
  const exclude =
    EXCLUDED_WORKSPACE_GLOBS.length > 0
      ? `{${EXCLUDED_WORKSPACE_GLOBS.join(',')}}`
      : undefined;

  for (const root of roots) {
    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(root, pattern),
      exclude
    );
    results.push(...found);
  }

  return uniqueUris(results);
};

const buildReplacementValue = (formatId: FormatId, resolved: ReturnType<typeof resolveColorFromCandidate>) => {
  if (!resolved) return null;

  const rawValue = formatColor(resolved.rgba, formatId);
  const isHexFormat = formatId === 'hex' || formatId === 'hex6' || formatId === 'hex8';

  if (resolved.source === 'function') {
    return wrapCssFunction(formatId, rawValue);
  }

  if (resolved.source === 'hex' && !isHexFormat) {
    return wrapCssFunction(formatId, rawValue);
  }

  return rawValue;
};

export const runConvertColorWorkspaceCommand = async (
  readConfig: () => ExtensionConfig,
  arg?: unknown
): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  const config = readConfig();
  let files: vscode.Uri[] = [];

  const explicitUris = normalizeUris(arg);
  if (explicitUris.length > 0) {
    const { files: explicitFiles, folders } = await splitUris(explicitUris);
    const folderRoots = folders.map((folder) => folder.fsPath);
    const folderFiles = folderRoots.length > 0 ? await collectFiles(folderRoots, config) : [];
    files = uniqueUris([...explicitFiles, ...folderFiles]);
  } else {
    const scope = await pickScope(editor);
    if (!scope) return;

    if (scope.scope === 'current') {
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
      }
      files = [editor.document.uri];
    } else if (scope.scope === 'workspace') {
      const folders = vscode.workspace.workspaceFolders ?? [];
      if (folders.length === 0) {
        vscode.window.showInformationMessage('No workspace folder is open.');
        return;
      }
      files = await collectFiles(
        folders.map((folder) => folder.uri.fsPath),
        config
      );
    } else {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select folder to convert'
      });
      if (!picked || picked.length === 0) return;
      files = await collectFiles([picked[0].fsPath], config);
    }
  }

  const format = await pickFormat();
  if (!format) return;

  if (files.length === 0) {
    vscode.window.showInformationMessage('No matching files found.');
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  let totalReplacements = 0;
  let filesTouched = 0;

  const progressResult = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'OKLCH Shade: Converting colors',
      cancellable: true
    },
    async (progress, token) => {
      const increment = 100 / files.length;

      for (let index = 0; index < files.length; index += 1) {
        if (token.isCancellationRequested) {
          return { cancelled: true };
        }

        const uri = files[index];
        progress.report({
          message: path.basename(uri.fsPath),
          increment
        });

        const document = await vscode.workspace.openTextDocument(uri);
        const scanOptions = {
          respectColorDirectives: false,
          respectConvertDirectives: true
        };
        const customPropertyMap = getCustomPropertyMap(document, config, scanOptions);
        const candidates = getScanCandidates(document, config, scanOptions);

        const replacements = candidates
          .map((candidate) => {
            const resolved = resolveColorFromCandidate(candidate, config, {
              customPropertyMap
            });
            const value = buildReplacementValue(format.formatId, resolved);
            if (!value) return null;

            const current = document.getText(candidate.range);
            if (current === value) return null;

            return { range: candidate.range, value };
          })
          .filter((item): item is { range: vscode.Range; value: string } => Boolean(item));

        if (replacements.length === 0) continue;

        filesTouched += 1;
        totalReplacements += replacements.length;

        replacements.sort((a, b) => b.range.start.compareTo(a.range.start));
        for (const replacement of replacements) {
          edit.replace(uri, replacement.range, replacement.value);
        }
      }

      return { cancelled: false };
    }
  );

  if (!progressResult || progressResult.cancelled) return;

  if (totalReplacements === 0) {
    vscode.window.showInformationMessage('No color tokens found to replace.');
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Replace ${totalReplacements} tokens in ${filesTouched} files with ${format.label}?`,
    { modal: true },
    'Replace'
  );

  if (confirm !== 'Replace') return;

  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    vscode.window.showErrorMessage('Failed to apply edits.');
    return;
  }

  vscode.window.showInformationMessage(
    `Converted ${totalReplacements} tokens in ${filesTouched} files.`
  );
};
