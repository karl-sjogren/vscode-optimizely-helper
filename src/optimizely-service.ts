import * as vscode from 'vscode';
import { promisify } from 'node:util';
import { join, } from 'node:path';
import { constants } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import * as childProcess from 'node:child_process';
import OptimizelyConfig from './OptimizelyConfig';

const exec = promisify(childProcess.exec);

const DEFAULT_CONFIG: OptimizelyConfig = {
    contentTypePath: '',
    contentTypeBaseNamespace: '',
    defaultContentTypeBaseClass: 'PageData',
    defaultContentComponentBaseClass: 'BlockData'
};

class OptimizelyService {
    async checkForTemplates(): Promise<boolean> {
        const { stdout, stderr } = await exec('dotnet new list');

        const matches = [...stdout.matchAll(/^(.*?)\s{2,}(.*?)\s{2,}(.*?)\s{2,}(.*?)\s{2,}(.*?)$/gim)];
        const shortNames = matches.map(match => match[2]);

        return shortNames.some(x => x === 'epi-cms-contenttype');
    }

    async tryInstallTemplates(): Promise<boolean> {
        await exec('dotnet new install EPiServer.Templates');

        return await this.checkForTemplates();
    }

    async createContentType(contentType = 'BlockData'): Promise<void> {
        const namespace = '';

        const { stdout, stderr } = await exec(`dotnet new -h epi-cms-contentcomponent --namespace ${namespace} --contentType ${contentType}`);
    }

    async createContentComponent(basetype = 'PageData'): Promise<void> {
        const namespace = '';

        const { stdout, stderr } = await exec(`dotnet new -h epi-cms-contentcomponent --namespace ${namespace} --basetype ${basetype}`);
    }

    async #getConfigPath(): Promise<null | string> {
        if (!vscode.workspace.workspaceFolders) {
            return null;
        }

        const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const path = join(workspace, '.optimizelyrc');

        return path;
    }

    async checkIfConfigExists(): Promise<'ConfigExists' | 'ConfigMissing' | 'NotInWorkspace'> {
        const configPath = await this.#getConfigPath();
        if (configPath === null) {
            return 'NotInWorkspace';
        }

        try {
            await access(configPath, constants.R_OK);
            return 'ConfigExists';
        } catch {
            return 'ConfigMissing';
        }
    }

    async createConfig(openInEditor: boolean): Promise<void> {
        var configExists = await this.checkIfConfigExists();
        if (configExists !== 'ConfigMissing') {
            return;
        }

        const configPath = await this.#getConfigPath();
        try {
            const defaultConfig = JSON.stringify(DEFAULT_CONFIG, null, 2);
            const data = new Uint8Array(Buffer.from(defaultConfig));
            await writeFile(configPath!, data);
        } catch (err) {
            console.error(err);
        }

        if(openInEditor) {
            const document = await vscode.workspace.openTextDocument(configPath!);
            await vscode.window.showTextDocument(document, 1, false);
        }
    }
}

export default OptimizelyService;
export let service = new OptimizelyService();