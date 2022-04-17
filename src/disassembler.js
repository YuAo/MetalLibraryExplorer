import LLVMDis from "./llvm-dis.js";

export class LLVMDisassembler {
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
