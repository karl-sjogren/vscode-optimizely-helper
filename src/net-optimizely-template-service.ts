import * as vscode from 'vscode';
import { join } from "node:path";
import IOptimizelyTemplateService from "./ioptimizely-template-service";
import OptimizelyService from "./optimizely-service";
import { formatDocument, openDocument } from './helpers/document-helpers';

export default class NetOptimizelyTemplateService implements IOptimizelyTemplateService {
    constructor(private service: OptimizelyService) {}

    async createContentType(name : string): Promise<void> {
        const { 
            contentTypePath: outputPath,
            contentTypeBaseNamespace: namespace,
            contentTypeBaseClass: baseType } = await this.service.readConfig();

        const stdout = await this.service.executeProcess(`dotnet new epi-cms-contenttype --name ${name} --namespace ${namespace} --basetype ${baseType} --output ${this.#getFullPath(outputPath)}`);

        if(!stdout.trimEnd().endsWith('was created successfully.')) {
            throw new Error(stdout);
        }

        await this.#formatAndOpenDocument(name, outputPath);
    }

    async createContentComponent(name: string): Promise<void> {
        const { 
            contentComponentPath: outputPath,
            contentComponentNamespace: namespace,
            contentComponentBaseClass: baseType } = await this.service.readConfig();

        const stdout = await this.service.executeProcess(`dotnet new epi-cms-contentcomponent --name ${name} --namespace ${namespace} --basetype ${baseType} --output ${this.#getFullPath(outputPath)}`);

        if(!stdout.trimEnd().endsWith('was created successfully.')) {
            throw new Error(stdout);
        }

        await this.#formatAndOpenDocument(name, outputPath);
    }

    async #formatAndOpenDocument(name : string, outputPath : string | null) : Promise<void> {
        if(outputPath === null) {
            throw new Error('No output path specified.');
        }

        const fullPath = this.#getFullPath(join(outputPath, name) + '.cs');
        const uri = vscode.Uri.file(fullPath);

        await formatDocument(uri);
        await openDocument(uri);
    }

    #getFullPath(path: string | null): string {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('Not in a workspace');
        }

        const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return join(workspace, path || '');
    }
}