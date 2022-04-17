import { init, WASI } from "@wasmer/wasi";

export class MetalLibraryParserProgram {
    constructor(wasi, instance) {
        this.wasi = wasi
        this.instance = instance
    }
}

export class MetalLibraryParser {
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

export class MetalLibraryParser_WebWorker {
    constructor(worker) {
        this.messageID = 0;
        this.callbacks = {};
        this.worker = worker;
        this.worker.onmessage = (event) => {
            const { id, errorMessage, result } = event.data;
            if (id in this.callbacks) {
                const callback = this.callbacks[id];
                if (errorMessage) {
                    callback.reject(new Error(errorMessage));
                } else {
                    callback.resolve(result);
                }
                delete this.callbacks[id];
            }
        };
    }

    init() {
        return new Promise((resolve, reject) => {
            this.messageID += 1;
            this.callbacks[this.messageID] = { resolve, reject };
            this.worker.postMessage({ id: this.messageID, action: "init" });
        });
    }

    parse(buffer) {
        return new Promise((resolve, reject) => {
            this.messageID += 1;
            this.callbacks[this.messageID] = { resolve, reject };
            this.worker.postMessage({ id: this.messageID, action: "parse", buffer }, [buffer]);
        });
    }
}
