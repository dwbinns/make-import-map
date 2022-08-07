import Server from "fs-serve";
import createImportMap from "make-import-map";
import { dirname, relative } from "path";




export default class ImportServer extends Server {
    constructor(root) {
        super(root, {
            ssi: [
                {
                    extension: "html",
                    handlers: [async ({ filename }) => await this.createScriptImportMap(filename)],
                }
            ],
            maxAge: 2,
        });


    }

    async createScriptImportMap(filename) {
        
        const pathToURL = (path, packageJSON) => {
            console.log("pathToURL", path, relative(dirname(filename), path), packageJSON?.name, packageJSON?.version);
            return `./${relative(dirname(filename), path)}`;
        };
        return `<script type="importmap">${await createImportMap(filename, pathToURL)}</script>`;
    }


    async serveRelative(path, req, res) {
        return await super.serveRelative(path, req, res);
    }

}