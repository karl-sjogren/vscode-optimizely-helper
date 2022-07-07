import * as vscode from 'vscode';
import { service } from './optimizely-service';

export function activate(context: vscode.ExtensionContext) {
	checkForTemplates();
	checkForConfigFile();

	let disposable = vscode.commands.registerCommand('karls-optimizely-helpers.createContentType', async () => {
		const name = await vscode.window.showInputBox({
			prompt: "Content type name: ",
			placeHolder: "StartPage"
		});

		if(name?.trim().length === 0) {
			return;
		}

	});

	context.subscriptions.push(disposable);
}

async function checkForTemplates() {
	const templatesInstalled = await service.checkForTemplates();
		
	if(templatesInstalled) {
		return;
	}

	const instructionsAction = 'Read instructions';
	const installAction = 'Try installing templates';

	const selectedAction = await vscode.window.showInformationMessage(
		'Episerver Templates not available.',
		instructionsAction,
		installAction,
	);

	if(selectedAction === instructionsAction) {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/karl-sjogren/vscode-optimizely-helper/'));
	}

	if(selectedAction === installAction) {
		const installSuccess = await service.tryInstallTemplates();
		vscode.window.showInformationMessage(
			installSuccess ? 'Episerver templates installed.' : 'Failed to install Episerver templates.',
		);
	}
}

async function checkForConfigFile() {
	const configExists = await service.checkIfConfigExists();
	if(configExists !== 'ConfigMissing') {
		return;
	}

	const createConfigAction = 'Create .optimizelyrc';

	const selectedAction = await vscode.window.showInformationMessage(
		'No workspace configuration found.',
		createConfigAction,
	);

	if(selectedAction === createConfigAction) {
		await service.createConfig(true);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
