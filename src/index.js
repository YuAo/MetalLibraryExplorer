import { init, WASI } from "@wasmer/wasi";
import LLVMDis from "./llvm-dis.js";
class Utilities {
    static base64Decode(sBase64, nBlocksSize) {
        function b64ToUint6(nChr) {
            return nChr > 64 && nChr < 91 ?
                nChr - 65
                : nChr > 96 && nChr < 123 ?
                    nChr - 71
                    : nChr > 47 && nChr < 58 ?
                        nChr + 4
                        : nChr === 43 ?
                            62
                            : nChr === 47 ?
                                63
                                :
                                0;
        }
        var
            sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
            nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2, taBytes = new Uint8Array(nOutLen);

        for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
            nMod4 = nInIdx & 3;
            nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 6 * (3 - nMod4);
            if (nMod4 === 3 || nInLen - nInIdx === 1) {
                for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
                    taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
                }
                nUint24 = 0;

            }
        }
        return taBytes;
    }
}

class MetalLibraryParserProgram {
    constructor(wasi, instance) {
        this.wasi = wasi
        this.instance = instance
    }
}

class MetalLibraryParser {
    constructor(program) {
        this.program = program;
    }
    async parse(file) {
        const parseMetalLib = this.program.instance.exports.parseMetalLib;
        const parser = this.program.wasi;
        const buffer = await file.arrayBuffer();

        const metallib = parser.fs.open("/default.metallib", { write: true, create: true, truncate: true });
        metallib.write(new Uint8Array(buffer));
        metallib.flush();
        
        const parserExitCode = parseMetalLib();
        const parserOutput = parser.getStdoutString();

        console.log(parserOutput);
        console.log(`Parser exit code: ${parserExitCode}.`);

        if (parserExitCode != 0) {
            throw new Error("Metallib parse failed: " + parserOutput);
        }
        
        const outputFile = parser.fs.open("/output.json", { read: true });
        const archive = JSON.parse(outputFile.readString());
        return archive;
    }
}

class LLVMDissambler {
    constructor(programData) {
        this.programData = programData;
        this.textDecoder = new TextDecoder();
    }
    async disassemble(bitcode) {
        // Cannot reset heap/stack after callMain. Need a new instance each time.
        const program = await new LLVMDis({
            noInitialRun: true,
            instantiateWasm: (imports, successCallback) => {
                WebAssembly.instantiateStreaming(this.programData.clone(), imports).then(function(output) {
                    successCallback(output.instance);
                }).catch(function(e) {
                    // Cannot report error here, because there's no failureCallback. Use alert instead.
                    window.alert('LLVMDis WASM Instantiation Failed! ' + e);
                    throw e;
                });
                return {};
            }
        });
        program.FS.writeFile("shader.air", bitcode);
        await program.callMain(["shader.air"]);
        const llBuffer = program.FS.readFile("shader.air.ll");
        const ll = this.textDecoder.decode(llBuffer);
        return ll;
    }
}

class App {
    constructor() {

    }

    async init() {
        try {
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

            let disassemblerModuleData = await fetch(new URL("./llvm-dis.wasm", import.meta.url));
            this.disassembler = new LLVMDissambler(disassemblerModuleData);
    
            const self = this;
            async function explore(file) {
                try {
                    const archive = await self.parser.parse(file);
                    const f = archive.functions[0];
                    console.log(archive);
                    const bitcode = Utilities.base64Decode(archive.bitcodeTable[f.bitcodeID]);
                    const ll = await self.disassembler.disassemble(bitcode);
                    console.log(ll);
                } catch(error) {
                    console.log("=== Got Error ===");
                    console.error(error);
                }
            };
    
            const fileSelector = window.document.querySelector("#file-selector");
            fileSelector.addEventListener('change', (event) => {
                const fileList = event.target.files;
                if (fileList.length > 0) {
                    explore(fileList[0]);
                }
            });
        } catch (error) {
            console.log("=== Got Error ===");
            console.error(error);
        }
    }
}

const app = new App();
app.init();