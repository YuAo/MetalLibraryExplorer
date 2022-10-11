# MetalLibraryExplorer

[![Build](https://github.com/YuAo/MetalLibraryExplorer/actions/workflows/build.yml/badge.svg)](https://github.com/YuAo/MetalLibraryExplorer/actions/workflows/build.yml)
[![Deploy](https://github.com/YuAo/MetalLibraryExplorer/actions/workflows/deploy.yml/badge.svg)](https://github.com/YuAo/MetalLibraryExplorer/actions/workflows/deploy.yml)

Parse and disassemble .metallib files in browser. https://yuao.github.io/MetalLibraryExplorer

**This is a [WebAssembly](https://webassembly.org/) port of [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive). In order to use this tool your browser must [support WebAssembly](https://caniuse.com/wasm).**

## Features

- Inspect `.metallib` files. Get information about library type, target platform, Metal functions, etc.

- Disassemble Metal function bitcode.

- Download Metal bitcode and assembly as a zip archive.

## Technologies

### Metal Library Archive Parser

The parser uses a WebAssembly version of the [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive) core library, built with [SwiftWasm](https://github.com/swiftwasm/swift).

[wasmer-js](https://github.com/wasmerio/wasmer-js) is used as WASI polyfill. ~~However due to [wasmer/issues/2792](https://github.com/wasmerio/wasmer/issues/2792), the parser has to run in a Web Worker.~~

`wasm-strip` from [WABT](https://github.com/WebAssembly/wabt) and `wasm-opt` from [binaryen](https://github.com/WebAssembly/binaryen) are used mainly to reduce the `.wasm` binary size.

### LLVM Disassembler

[llvm-dis](https://llvm.org/docs/CommandGuide/llvm-dis.html) is used to convert the Metal bitcode into human-readable LLVM assembly language. This is also compiled to WebAssembly using [this workflow](https://github.com/YuAo/llvm-wasm/blob/master/.github/workflows/build-llvm-dis.yml).

### User Interface

The UI is built with [React](https://reactjs.org/) and [tailwindcss](https://tailwindcss.com/)

### Zip Archive & File Download

[JSZip](https://stuk.github.io/jszip/) & [FileSaver](https://github.com/eligrey/FileSaver.js/)

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

## More About `.metallib` Files

See [MetalLibraryArchive](https://github.com/YuAo/MetalLibraryArchive).
