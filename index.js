#!/usr/bin/env node

import { lstat, readFile } from "fs/promises";
import { dirname, join } from "path";

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
        return [path, found];
    }
    if (dirname(path) != path) return await findModulePath(dirname(path), moduleName);
    throw new Error(`Unable to find module: ${moduleName}`);
}



function urlPathJoin(...args) {
    let result = args
        .map(arg => arg.split("/")/*.filter(component => component && component != '.')*/)
        .reduce(
            (base, extra) => {
                while (extra[0] == ".." && base.length) {
                    base.pop();
                    extra.shift();
                }
                return [...base, ...extra];
            },
            []
        );

    return result.join("/");
}


async function addPackage(modulePath, scope, scopes, packages, toURL) {
    if (packages.has(modulePath)) return;

    packages.add(modulePath);

    const packageJSON = await loadPackageJSON(modulePath);

    let packageBase = toURL(modulePath, packageJSON);

    function parseExports(path, exports) {
        if (!exports) return;

        if (typeof exports == "string") {
            scope[urlPathJoin(packageJSON.name, path)] = urlPathJoin(packageBase, exports);
        }

        parseExports(path, ["import", "default"].map(key => exports[key]).find(Boolean));

        for (let [exported, subExports] of Object.entries(exports)) {
            if (exported.startsWith(".")) {
                parseExports(exported, subExports);
            }
        }
    }



    if (packageJSON.exports) {
        parseExports(".", packageJSON.exports);
    } else if (packageJSON.main) {
        scope[packageJSON.name] = urlPathJoin(packageBase, packageJSON.main);
    } else {
        scope[packageJSON.name] = urlPathJoin(packageBase, "index.js");
    }

    for (let module in packageJSON.dependencies) {
        const [scopePath, dependencyPath] = await findModulePath(modulePath, module)
        const scope = scopes[toURL(scopePath + "/")] ||= {};
        await addPackage(dependencyPath, scope, scopes, packages, toURL);
    }

}


export default async function createImportMap(filename, toURL) {

    const imports = {};
    const scopes = {};

    let modulePath = await findPackage(filename);

    if (!modulePath) throw new Error(`Unable to find package.json for file: ${filename}`);

    await addPackage(modulePath, imports, scopes, new Set(), toURL);

    const importMap = {
        imports,
        scopes
    }

    return JSON.stringify(importMap, null, 4);
}
