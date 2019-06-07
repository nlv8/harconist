'use strict';

import * as vscode from 'vscode'

import * as discovery from './discovery';
import * as processor from './processor';

interface EntityMap {
    [index: string]: processor.Entity
};

let entities: EntityMap = {}

function getPropertyOrDefault<T>(property: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration().has(property)
        ? <T>vscode.workspace.getConfiguration().get(property)
        : defaultValue;
};

async function reloadEntities(baseDirectories: string[]): Promise<void> {
    await discovery.discoverEntityPaths(baseDirectories);

    const paths = discovery.getEntityPaths()

    const opts: processor.ProcessorOptions = {
        dropLifecycleFunctions: getPropertyOrDefault('harconist.dropLifecycleFunctions', true),
        dropUnderscoreFunctions: getPropertyOrDefault('harconist.dropUnderscoreFunctions', true)
    };

    const entityArray = (await Promise.all(paths.map(p => processor.processEntity(p, opts))))
        .filter(p => p != null)

    const entityObject: EntityMap = {};

    entityArray.forEach((entity: any) => {
        entityObject[entity.name] = entity;
    });

    entities = entityObject;

    vscode.window.showInformationMessage(`Harconist: ${Object.keys(entities).length} entities found.`);
};

function makeFunctionDocumentation(f: processor.Function): vscode.MarkdownString {
    let str = f.documentation;

    if (f.parameters.length > 0) {
        const params = f.parameters
            .map(p => `  * **${p.name}** – ${p.documentation}`)
            .join('\n');

        str += `\n${params}\n`;
    }

    if (f.throws.length > 0) {
        const throws = f.throws
            .map(t => `  * ${t}`)
            .join('\n');

        str += `\n**Throws**\n${throws}\n`;
    }

    if (f.returns) {
        str += `\n\n**Returns**\n${f.returns}\n`;
    }

    return new vscode.MarkdownString(str);
};

export function activate(context: vscode.ExtensionContext) {
    const command = vscode.commands.registerCommand('harconist.reload', () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Reloading Harcon entities.',
            cancellable: false
        }, async () => {
            // Don't touch that mouse
            const anyad = <Array<string>>(vscode.workspace.getConfiguration().get('harconist.rootFolders') || [])

            let folders = anyad;

            if (vscode.workspace.workspaceFolders) {  
                const workspaceFolders = vscode.workspace.workspaceFolders
                    .filter(w => "file" == w.uri.scheme)
                    .map(w => w.uri.fsPath);

                folders = folders.concat(workspaceFolders);
            }

            await reloadEntities(folders);
        });
    });

    const triggerEndings = [
        'request(\'',
        'request(\"',
        'inform(\'',
        'inform(\"',
    ];

    const signatureEndings = [
        'request',
        'inform'
    ];

    const javascriptFileSelector: vscode.DocumentSelector = {
        scheme: 'file',
        language: 'javascript'
    };

    const entityProvider = vscode.languages.registerCompletionItemProvider(
        javascriptFileSelector,
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);

                const hasAppropriateEnding = triggerEndings.some(ending => linePrefix.endsWith(ending))

                if (!hasAppropriateEnding) {
                    return undefined;
                }

                return Object.values(entities)
                    .map(entity => {
                        const item = new vscode.CompletionItem(entity.name, vscode.CompletionItemKind.Class);

                        item.documentation = entity.documentation;
                        item.detail = entity.service;

                        return item;
                    });
            }
        },
        '\'',
        '\"'
    );

    const methodProvider = vscode.languages.registerCompletionItemProvider(
        javascriptFileSelector,
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);

                const call = triggerEndings.find(ending => linePrefix.includes(ending));

                if (!call) {
                    return undefined;
                }

                const entityNameWithDot = linePrefix.split(call)[1];
                const entityName = entityNameWithDot.slice(0, -1);

                return entities[entityName]
                    .functions
                    .map(f => {
                        const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);

                        item.documentation = makeFunctionDocumentation(f);

                        return item;
                    });
            }
        },
        '.'
    )

    const linkProvider = vscode.Disposable.from(
        vscode.languages.registerDefinitionProvider(
            javascriptFileSelector,
            {
                provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                    const linePrefix = document.lineAt(position).text.substr(0, position.character);

                    const call = triggerEndings.find(ending => linePrefix.includes(ending));

                    if (!call) {
                        return [];
                    }

                    const line = document.lineAt(position).text

                    const dotPos = linePrefix.lastIndexOf('.');
                    const aposPos = line.indexOf('\'', dotPos);

                    const functionName = line.substring(dotPos + 1, aposPos);

                    const entityName = linePrefix.substring(linePrefix.lastIndexOf('\'') + 1, dotPos);

                    const entity = entities[entityName]

                    if (!entity) {
                        return [];
                    }

                    const fn = entity.functions.find(f => f.name == functionName)

                    if (!fn) {
                        return [];
                    }

                    const result: vscode.DefinitionLink = {
                        targetUri: vscode.Uri.file(fn.location.path),
                        targetRange: new vscode.Range(fn.location.line, 0, fn.location.line, 0)
                    }

                    return [result];
                }
            }
        )
    )

    context.subscriptions.push(command, entityProvider, methodProvider, linkProvider);
};

export function deactive() {
    console.log('Harconist deactivated.');
};
