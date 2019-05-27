import * as fg from 'fast-glob';


let entityPaths: string[] = [];

function discoverEntityPathsInDirectory(baseDirectory: string): string[] {
    const options = {
        cwd: baseDirectory,
        absolute: true
    };

    return fg.sync([
        'src/bus/*.d.ts',
        'bus/*.d.ts',
        '*/src/bus/*.d.ts',
        '*/bus/*.d.ts',
    ], options);
};

export function getEntityPaths(): string[] {
    return [...entityPaths];
};

export function discoverEntityPaths(baseDirectories: string[]): void {
    entityPaths = baseDirectories
        .map(discoverEntityPathsInDirectory)
        .reduce((acc, curr) => acc.concat(curr), []);
};
