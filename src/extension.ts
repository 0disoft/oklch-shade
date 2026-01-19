import * as vscode from 'vscode';
import { runConvertColorCommand } from './commands/convertColor';
import { runConvertColorWorkspaceCommand } from './commands/convertColorWorkspace';
import { getConfig } from './config';
import { clearScanCache, clearScanCacheForUri } from './parser/scanCache';
import { ColorDecorationManager } from './provider/colorDecorations';
import { RawColorProvider } from './provider/colorProvider';
import { resolveColorAtSelection } from './provider/colorResolution';
import { RawColorHoverProvider } from './provider/hoverProvider';
import { InlineActionProvider } from './provider/inlineActionProvider';
import { StatusBarAction } from './provider/statusBarAction';

export function activate(context: vscode.ExtensionContext) {
  const provider = new RawColorProvider(getConfig);
  const hoverProvider = new RawColorHoverProvider(getConfig);
  const inlineActionProvider = new InlineActionProvider(getConfig);
  const statusBarAction = new StatusBarAction(getConfig);
  const colorDecorations = new ColorDecorationManager(getConfig);
  let registrations: vscode.Disposable[] = [];

  const updateEditorState = (editor?: vscode.TextEditor) => {
    const config = getConfig();
    if (!editor || !config.languages.includes(editor.document.languageId)) {
      void vscode.commands.executeCommand('setContext', 'oklchShade.hasColor', false);
      statusBarAction.update(editor, null, config);
      return;
    }

    const resolved = resolveColorAtSelection(editor.document, editor.selection, config, {
      respectColorDirectives: false,
      respectConvertDirectives: true
    });
    void vscode.commands.executeCommand('setContext', 'oklchShade.hasColor', Boolean(resolved));
    statusBarAction.update(editor, resolved, config);
    colorDecorations.update(editor);
  };

  const registerProviders = () => {
    // Re-register providers so new settings apply immediately.
    registrations.forEach((disposable) => disposable.dispose());
    registrations = [];

    const config = getConfig();
    const selectors = config.languages.map((language) => ({ language }));

    if (selectors.length === 0) return;

    registrations.push(vscode.languages.registerColorProvider(selectors, provider));
    registrations.push(vscode.languages.registerHoverProvider(selectors, hoverProvider));
    if (config.inlineAction) {
      registrations.push(vscode.languages.registerInlayHintsProvider(selectors, inlineActionProvider));
    }
  };

  registerProviders();
  updateEditorState(vscode.window.activeTextEditor);
  colorDecorations.update(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.commands.registerCommand('oklch-shade.convertColor', (range?: vscode.Range) =>
      runConvertColorCommand(getConfig, range)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('oklch-shade.convertColorWorkspace', (arg?: unknown) =>
      runConvertColorWorkspaceCommand(getConfig, arg)
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateEditorState(editor);
      colorDecorations.update(editor);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      updateEditorState(event.textEditor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('oklchShade')) {
        clearScanCache();
        registerProviders();
        updateEditorState(vscode.window.activeTextEditor);
        colorDecorations.update(vscode.window.activeTextEditor);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      clearScanCacheForUri(document.uri);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === event.document.uri.toString()) {
          colorDecorations.schedule(editor);
        }
      }
    })
  );

  context.subscriptions.push({
    dispose: () => {
      registrations.forEach((disposable) => disposable.dispose());
      registrations = [];
      statusBarAction.dispose();
      colorDecorations.dispose();
    }
  });
}

export function deactivate() {}
