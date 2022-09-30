import { init, WASI } from "@wasmer/wasi";

export class MetalLibraryParserProgram {
    constructor(wasi, instance) {
        this.wasi = wasi
        this.instance = instance
    }
}

export class MetalLibraryParser {

    static async makeParser(moduleResponse) {
        await init();
        let wasi = new WASI({
            env: {},
            args: []
        });
        const module = await WebAssembly.compileStreaming(moduleResponse);
        const importObject = wasi.getImports(module);
        const webAssemblyInstance = await WebAssembly.instantiate(module, importObject);
        const instance = wasi.instantiate(webAssemblyInstance, {});
        const parserProgram = new MetalLibraryParserProgram(wasi, instance);
        return new MetalLibraryParser(parserProgram);
    }

    constructor(program) {
        this.program = program;
    }
    
    async parse(buffer) {
        const parseMetalLib = this.program.instance.exports.parseMetalLib;
        const parser = this.program.wasi;

        const metallib = parser.fs.open("/default.metallib", { write: true, create: true, truncate: true });
        metallib.write(new Uint8Array(buffer));
        
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