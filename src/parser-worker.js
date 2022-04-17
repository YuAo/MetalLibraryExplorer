import { init, WASI } from "@wasmer/wasi";
import { MetalLibraryParser, MetalLibraryParserProgram } from "./parser.js";

class App {
    constructor() {
    }
    async init() {
        await init();
        const parserProgram = await (async () => {
            let wasi = new WASI({
                env: {},
                args: []
            });
            const moduleData = fetch(new URL('./MetalLibraryArchiveParser/.build/release/MetalLibraryArchiveParser.wasm', import.meta.url));
            const module = await WebAssembly.compileStreaming(moduleData);
            const instance = await wasi.instantiate(module, {});
            return new MetalLibraryParserProgram(wasi, instance);
        })();
        this.parser = new MetalLibraryParser(parserProgram);
    }
}

const app = new App();

onmessage = ({ data: { id, action, buffer } }) => {
    if (action === "init") {
        app.init().then(() => {
            self.postMessage({ id });
        }).catch(error => {
            let errorMessage = error.message;
            self.postMessage({ id, errorMessage });
        });
    } else if (action === "parse") {
        app.parser.parse(buffer).then(result => {
            self.postMessage({ id, result });
        }).catch(error => {
            let errorMessage = error.message;
            self.postMessage({ id, errorMessage });
        });
    } else {
        self.postMessage({ id, errorMessage: "Unknown action: " + action });
    }
};