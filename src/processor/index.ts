import * as fs from 'fs';
import * as path from 'path';

const jsdoc = require('jsdoc-api');


async function exists(p: string): Promise<boolean> {
    return new Promise(resolve => fs.exists(p, resolve));
};

const LIFECYCLE_FUNCTION_NAMES = [
    'init', 'close'
];

export interface Location {
    path: string;
    line: number;
};

interface RawParameter {
    name: string;
    type: string;
    documentation: string;
};

export interface Parameter {
    name: string;
    type: string;
    properties: Parameter[];
    documentation: string;
};

export interface Function {
    location: Location;
    name: string;
    documentation: string;
    throws: string[],
    returns: string,
    parameters: Parameter[]
};

export interface Entity {
    location: Location;
    name: string;
    service: string;
    documentation: string;
    functions: Function[];
};

export interface ProcessorOptions {
    dropLifecycleFunctions?: boolean;
    dropUnderscoreFunctions?: boolean;
};

async function parseElements(entityPath: string): Promise<any> {
    const source = await fs.promises.readFile(entityPath);

    return await jsdoc.explain({
        source
    });
};

function findEntityElement(elements: any[]): any {
    const moduleExportsElement = elements
        .find((element: any) => element.longname == 'module.exports')

    if (!moduleExportsElement) {
        return null;
    }

    if (moduleExportsElement.meta.code.type == 'ObjectExpression') {
        return moduleExportsElement;
    }

    const entityElementName = moduleExportsElement.meta.code.value
    
    return elements.find((element: any) => element.name == entityElementName) || null;
};

function getNamePropertyValue(elements: any[], parentElement: any): string | null {
    const namePropertyElement = 
        elements.find((element: any) => element.longname == `${parentElement.longname}.name`)

    if (!namePropertyElement) {
        return null;
    }

    if (namePropertyElement.meta.code.type != 'Literal') {
        return null;
    }

    return namePropertyElement.meta.code.value;
};

function getMemberFunctionElementsOf(elements: any[], parentElement: any): any[] {
    return elements
        .filter((element: any) => element.longname.startsWith(parentElement.longname))
        .filter((element: any) => !element.longname.includes('#'))
        .filter((element: any) => element.meta.code.type == 'FunctionExpression');
};

function getLocationOf(path: string, element: any): Location {
    return {
        path,
        line: element.meta.lineno
    };
};

function getDocumentationOf(element: any): string {
    return element.description || '';
};

function elementToFunction(path: string, element: any): Function {
    let parameters = []
    if (element.params) {
        parameters = element.params.map((param: any) => ({
            name: param.name,
            documentation: param.description
        }));
    }

    let throws = [];
    if (element.exceptions) {
        throws = element.exceptions.map((exception: any) => ({
            name: exception.name,
            documentation: exception.description
        }));
    }

    let returns = '';
    if (element.returns) {
        returns = element.returns[0].description;
    }

    return {
        location: getLocationOf(path, element),
        name: element.name,
        documentation: getDocumentationOf(element),
        parameters,
        throws,
        returns
    };
};

export async function processEntity(entityPath: string, options: ProcessorOptions = {}): Promise<Entity | null> {
    console.log('Harconist: processing entity');
    console.log(entityPath);

    const elements = await parseElements(entityPath);

    const entityDirectory = path.dirname(entityPath);

    let packageJsonPath;
    if (entityDirectory.endsWith('src\/bus') || entityDirectory.endsWith('src\\bus')) {
        packageJsonPath = path.resolve(entityDirectory, '..', '..', 'package.json');
    } else {
        packageJsonPath = path.resolve(entityDirectory, '..', 'package.json');
    }

    let service = '';
    if (await exists(packageJsonPath)) {
        service = require(packageJsonPath).name;
    }

    const entityElement = findEntityElement(elements);

    if (!entityElement) {
        return null;
    }

    const entityName = getNamePropertyValue(elements, entityElement);

    if (!entityName) {
        return null;
    }

    const functions = getMemberFunctionElementsOf(elements, entityElement)
        .filter(element => {
            if (options.dropLifecycleFunctions) {
                return !LIFECYCLE_FUNCTION_NAMES.includes(element.name);
            }

            return true;
        })
        .filter(element => {
            if (options.dropUnderscoreFunctions) {
                return !element.name.startsWith('_');
            }

            return true;
        })
        .map(element => elementToFunction(entityPath, element));

    return {
        location: getLocationOf(entityPath, entityElement),
        name: entityName,
        service,
        documentation: getDocumentationOf(entityElement),
        functions
    };
};
