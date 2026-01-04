import * as vscode from 'vscode';
import { runConvertColorCommand } from './commands/convertColor';
import { runConvertColorWorkspaceCommand } from './commands/convertColorWorkspace';
import { getConfig } from './config';
import { RawColorProvider } from './provider/colorProvider';
import { RawColorHoverProvider } from './provider/hoverProvider';
import { InlineActionProvider } from './provider/inlineActionProvider';
import { StatusBarAction } from './provider/statusBarAction';
import { resolveColorAtSelection } from './provider/colorResolution';

export function activate(context: vscode.ExtensionContext) {
  const provider = new RawColorProvider(getConfig);
  const hoverProvider = new RawColorHoverProvider(getConfig);
  const inlineActionProvider = new InlineActionProvider(getConfig);
  const statusBarAction = new StatusBarAction(getConfig);
  let registrations: vscode.Disposable[] = [];

  const updateContext = (editor?: vscode.TextEditor) => {
    const config = getConfig();
    if (!editor || !config.languages.includes(editor.document.languageId)) {
      void vscode.commands.executeCommand('setContext', 'oklchShade.hasColor', false);
      return;
    }

    const resolved = resolveColorAtSelection(editor.document, editor.selection, config, {
      respectColorDirectives: false,
      respectConvertDirectives: true
    });
    void vscode.commands.executeCommand('setContext', 'oklchShade.hasColor', Boolean(resolved));
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
  statusBarAction.update(vscode.window.activeTextEditor);
  updateContext(vscode.window.activeTextEditor);

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
      statusBarAction.update(editor);
      updateContext(editor);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      statusBarAction.update(event.textEditor);
      updateContext(event.textEditor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('oklchShade')) {
        registerProviders();
        statusBarAction.update(vscode.window.activeTextEditor);
        updateContext(vscode.window.activeTextEditor);
      }
    })
  );

  context.subscriptions.push({
    dispose: () => {
      registrations.forEach((disposable) => disposable.dispose());
      registrations = [];
      statusBarAction.dispose();
    }
  });
}

export function deactivate() {}
