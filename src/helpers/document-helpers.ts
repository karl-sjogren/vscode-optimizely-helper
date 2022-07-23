import * as vscode from 'vscode';

export let formatDocument = async(uri : vscode.Uri) : Promise<void> => {
    const formattingOptions = { insertSpaces: true, tabSize: 2 } as vscode.FormattingOptions;
    const formatEdits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', uri, formattingOptions) as vscode.TextEdit[];

    if(!!formatEdits) {
        const edit = new vscode.WorkspaceEdit();
        for (const textEdit of formatEdits) {
            edit.replace(uri, textEdit.range, textEdit.newText);
        }
        await vscode.workspace.applyEdit(edit);

        const document = await vscode.workspace.openTextDocument(uri);
        await document.save();
    }
};

export let openDocument = async(uri : vscode.Uri) : Promise<void> => {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, undefined, false);
};