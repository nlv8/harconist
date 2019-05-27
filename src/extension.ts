'use strict';

import * as vscode from 'vscode'
import * as discovery from './discovery';
import * as path from 'path';


export function activate(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('harconist.reload', () => {
        const base = path.resolve(__dirname, '..', '..');

        discovery.discoverEntityPaths([base]);

        vscode.window.showInformationMessage(`Harconist: ${discovery.getEntityPaths().length} entities found.`);

        console.log(discovery.getEntityPaths());
    });
};

export function deactive() {
    console.log('Harconist deactivated.');
};
