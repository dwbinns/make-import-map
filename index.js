#!/usr/bin/env node

import { readFile, lstat } from "fs/promises";
import { createRequire } from "module";
import { relative, dirname, resolve, join, sep } from "path";
import { pathToFileURL } from "url";

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


function relativeURL(basePath, targetPath) {
    return relative(basePath, targetPath).split(sep).join("/");
}

async function findModulePath(path, moduleName) {
    let found = join(path, "node_modules", moduleName);
    if (await lstat(found).catch(e => false)) {
        return [path, found];
    }
    if (dirname(path) != path) return await findModulePath(dirname(path), moduleName);
    throw new Error(`Unable to find module: ${moduleName}`);
}

async function addPackage(modulePath, scope, scopes, packages, toURL) {
    if (packages.has(modulePath)) return;

    packages.add(modulePath);


    const packageJSON = await loadPackageJSON(modulePath);
    console.log(modulePath);
    //const require = createRequire(modulePath);

    //const [packageJSONPath, packageJSON] = await findPackageJSON(modulePath);

    //const packagePath = dirname(packageJSONPath);

    //    let moduleURL = pathToFileURL(modulePath);

    if (packageJSON.exports) {
        for (let [exported, path] of Object.entries(packageJSON.exports)) {
            scope[join(packageJSON.name, exported)] = toURL(resolve(modulePath, path)).toString();
        }
    } else {
        scope[packageJSON.name] = toURL(join(modulePath, "index.js")).toString();
    }

    for (let module in packageJSON.dependencies) {
        const [scopePath, dependencyPath] = await findModulePath(modulePath, module)
        //const modulePath = require.resolve(module);
        console.log(`${module} -> ${dependencyPath}`);
        const scope = scopes[toURL(scopePath + "/")] ||= {};
        await addPackage(dependencyPath, scope, scopes, packages, toURL);
    }

}


export default async function createImportMap(filename, toURL) {

    const imports = {};
    const scopes = {};

    console.log("create import map", filename);

    let modulePath = await findPackage(filename);

    if (!modulePath) throw new Error(`Unable to find package.json for file: ${filename}`);

    await addPackage(modulePath, imports, scopes, new Set(), toURL);

    const importMap = {
        imports,
        scopes//Object.fromEntries(Object.entries(scopes).filter(([, value]) => Object.keys(value).length)),
    }

    return JSON.stringify(importMap, null, 4);
}
