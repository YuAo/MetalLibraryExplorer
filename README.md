# MetalLibraryExplorer

Parse and disassemble .metallib files in browser.

https://yuao.github.io/MetalLibraryExplorer

This is a WebAssembly version of [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive). Your browser needs to support [WebAssembly](https://webassembly.org/) to use this tool.

## More About `.metallib` Files

See [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive).

## Technologies

- Metal Library Archive Parser

    The parser uses a WebAssembly version of the [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive) core library, built with [SwiftWasm](https://github.com/swiftwasm/swift).

    [wasmer-js](https://github.com/wasmerio/wasmer-js) is used as WASI polyfill. However due to [wasmer/issues/2792](https://github.com/wasmerio/wasmer/issues/2792), the parser has to run in a Web Worker.

    `wasm-strip` from [WABT](https://github.com/WebAssembly/wabt) and `wasm-opt` from [binaryen](https://github.com/WebAssembly/binaryen) are used mainly to reduce the `.wasm` binary size.

- LLVM Disassembler

    [llvm-dis](https://llvm.org/docs/CommandGuide/llvm-dis.html) is used to convert the Metal bitcode into human-readable LLVM assembly language. This is also compiled to WebAssembly using [this workflow](https://github.com/YuAo/llvm-wasm/blob/master/.github/workflows/build-llvm-dis.yml).


- User Interface

    The UI is built with [React](https://reactjs.org/) and [tailwindcss](https://tailwindcss.com/)

## Building

To build this library you will need to have installed in your system:

- [Node.js](https://nodejs.org/)
- [WABT](https://github.com/WebAssembly/wabt)
- [binaryen](https://github.com/WebAssembly/binaryen)
- [SwiftWasm](https://swiftwasm.org/)

### Build

```shell
npm install
npm run build
```

### Develop

```shell
npm install
npm run start
```