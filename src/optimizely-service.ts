import * as vscode from 'vscode';
import { promisify } from 'node:util';
import { join, } from 'node:path';
import { constants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import * as childProcess from 'node:child_process';
import OptimizelyConfig from './optimizely-config';
import { formatDocument, openDocument } from './helpers/document-helpers';

const exec = promisify(childProcess.exec);

const DEFAULT_CONFIG: OptimizelyConfig = {
    contentTypePath: './',
    contentTypeBaseNamespace: 'ContentTypes',
    contentTypeBaseClass: 'EPiServer.Core.PageData',
    contentComponentPath: './',
    contentComponentNamespace: 'Components',
    contentComponentBaseClass: 'EPiServer.Core.BlockData'
};

class OptimizelyService {
    static configFileName = '.optimizelyrc.json';
    
    #outputChannel: vscode.OutputChannel;

    constructor() {
        this.#outputChannel = vscode.window.createOutputChannel('Optimizely');
    }

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

    async executeProcess(command: string): Promise<string> {
        this.#outputChannel.appendLine(`Executing: ${command}`);

        const { stdout, stderr } = await exec(command);
        if(stdout) {
            this.#outputChannel.appendLine(stdout);
        }

        if(stderr) {
            this.#outputChannel.appendLine(`Failed when executing: ${command}`);
            this.#outputChannel.appendLine(stderr);
            throw new Error(stderr);
        }

        return stdout;
    }

    async #getConfigPath(): Promise<null | string> {
        if (!vscode.workspace.workspaceFolders) {
            return null;
        }

        const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const path = join(workspace, OptimizelyService.configFileName);

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
            const defaultConfig = JSON.stringify(DEFAULT_CONFIG);
            const data = new Uint8Array(Buffer.from(defaultConfig));
            await writeFile(configPath!, data);
        } catch (err) {
            console.error(err);
            return; // TODO Show messagebox?
        }

        const uri = vscode.Uri.file(configPath!);
        await formatDocument(uri);

        if(openInEditor) {
            await openDocument(uri);
        }
    }

    async readConfig(): Promise<OptimizelyConfig> {
        const configPath = await this.#getConfigPath();
        if (configPath === null) {
            return DEFAULT_CONFIG;
        }

        const data = await readFile(configPath, 'utf8');
        return JSON.parse(data);
    }
}

export default OptimizelyService;
export let service = new OptimizelyService();