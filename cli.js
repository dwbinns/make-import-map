#!/usr/bin/env node

import { writeFile } from "fs/promises";
import { createServer } from "http";
import createImportMap from "./index.js";
import ImportServer from "./Server.js";

const [command, root, target] = process.argv.slice(2);


if (command == "serve") {

    const server = new ImportServer(root);
    createServer((request, response) => {
        server.serve(request, response);
    }).listen(4000);

    console.log("Listening on http://localhost:4000");
} else if (command == "save") {
    await writeFile(target, await createImportMap(root, path => path));
} else if (command == "make") {
    console.log(await createImportMap(root, path => path));
} else {
    console.log("make-import-map make <root>");
    console.log("make-import-map save <root> <import-map-file>");
    console.log("make-import-map serve <root>");
}