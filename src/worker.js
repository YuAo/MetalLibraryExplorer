import { init, WASI } from "@wasmer/wasi";

var wasiInitialized = false;
async function task() {
    if (!wasiInitialized) {
        await init();
        wasiInitialized = true;
    }
    let wasi = new WASI({
        env: {},
        args: []
    });
    const response = fetch(new URL('./MetalLibraryArchiveParser/.build/release/MetalLibraryArchiveParser.wasm', import.meta.url));
    const module = await WebAssembly.compileStreaming(response);
    await wasi.instantiate(module, {});
    return wasi;
}

self.onmessage = ({ data: { id } }) => {
    task().then(result => {
        self.postMessage({ id, result });
    }).catch(error => {
        let errorMessage = error.message;
        self.postMessage({ id, error: errorMessage });
    });
};