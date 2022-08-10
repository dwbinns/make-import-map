#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";


async function findPackage(path) {
    const packageJSONPath = join(path, "package.json");
    if (await lstat(packageJSONPath).catch(e => false)) {
        return path;
    }

    if (dirname(path) != path) {
        return await findPackage(dirname(path));
    }
}

async function loadPackageJSON(modulePath) {
    return JSON.parse(await readFile(join(modulePath, "package.json")));
}

async function findModulePath(path, moduleName) {
    let found = join(path, "node_modules", moduleName);
    if (await lstat(found).catch(e => false)) {
        return found;
    }
    if (dirname(path) != path) return await findModulePath(dirname(path), moduleName);
    throw new Error(`Unable to find module: ${moduleName}`);
}




export default async function createImportMap(filename, toURL) {

    let packages = new Set();

    async function addPackage(packagePath) {
        if (packages.has(packagePath)) return;
        packages.add(packagePath);

        const scopePath = dirname(dirname(packagePath));
        const scope = scopePath == rootModulePath ? imports : scopes[toURL(scopePath) + "/"] ||= {};

        const packageJSON = await loadPackageJSON(packagePath);

        function parseExports(path, exports) {
            if (!exports) return;

            if (typeof exports == "string") {
                scope[posix.join(packageJSON.name, path)] = toURL(join(packagePath, exports));
            }

            parseExports(path, ["import", "default"].map(key => exports[key]).find(Boolean));

            for (let [exported, subExports] of Object.entries(exports)) {
                if (exported.startsWith(".")) {
                    parseExports(posix.join(path, exported), subExports);
                }
            }
        }

        if (packageJSON.exports) {
            parseExports(".", packageJSON.exports);
        } else if (packageJSON.main) {
            scope[packageJSON.name] = toURL(join(packagePath, packageJSON.main));
        } else {
            scope[packageJSON.name] = toURL(join(packagePath, "index.js"));
        }


        for (let module in packageJSON.dependencies) {
            await addPackage(await findModulePath(packagePath, module));
        }
    }


    const imports = {};
    const scopes = {};

    let rootModulePath = await findPackage(filename);

    if (!rootModulePath) throw new Error(`Unable to find package.json for file: ${filename}`);

    await addPackage(rootModulePath);

    const importMap = {
        imports,
        scopes
    }

    return JSON.stringify(importMap, null, 4);
}


