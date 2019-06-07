import * as fs from 'fs'
import * as path from 'path'

async function asyncFind<T>(arr: Array<T>, predicate: (value: T) => Promise<boolean>): Promise<T | null> {
    let result: T | null = null;

    for (const v of arr) {
        if (await predicate(v)) {
            return v;
        }
    }

    return result;
};

async function asyncFilter<T>(arr: Array<T>, predicate: (value: T) => Promise<boolean>): Promise<Array<T>> {
    const result: Array<T> = [];

    for (const v of arr) {
        if (await predicate(v)) {
            result.push(v);
        }
    }

    return result;
};

let entityPaths: string[] = [];

async function exists(p: string): Promise<boolean> {
    return new Promise(resolve => fs.exists(p, resolve));
};

async function discoverEntityPathsInDirectory(directory: string): Promise<string[]> {
    const busPath = await asyncFind([
        path.join(directory, 'bus'),
        path.join(directory, 'src', 'bus')
    ], exists);

    if (!busPath) {
        return []
    }

    const entries = (await fs.promises.readdir(busPath))
        .map(p => path.join(busPath, p));

    return (await asyncFilter(entries, isFile))
        .filter((p: string) => p.endsWith('.js'));
};

async function isDirectory(p: string): Promise<boolean> {
    const stat = await fs.promises.lstat(p);

    return stat.isDirectory();
};

async function isFile(p: string): Promise<boolean> {
    const stat = await fs.promises.lstat(p);

    return stat.isFile();
};

async function discoverBaseDirectory(baseDirectory: string): Promise<string[]> {
    const entities = await discoverEntityPathsInDirectory(baseDirectory);

    if (entities.length > 0) {
        return Promise.resolve(entities);
    }

    const entries = (await fs.promises.readdir(baseDirectory))
        .map(p => path.join(baseDirectory, p))

    const directories = await asyncFilter(entries, isDirectory);

    return (await Promise.all(directories.map(discoverEntityPathsInDirectory)))
        .reduce((acc, curr) => acc.concat(curr), []);
};

export function getEntityPaths(): string[] {
    return [...entityPaths];
};

export async function discoverEntityPaths(baseDirectories: string[]): Promise<void> {
    const arrs = await Promise.all(baseDirectories.map(discoverBaseDirectory))

    entityPaths = arrs.reduce((acc, curr) => acc.concat(curr), []);
};
