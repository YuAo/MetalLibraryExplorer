import { MetalLibraryParser_WebWorker } from "./parser.js";
import { LLVMDisassembler } from "./disassembler.js";
import { Utilities } from "./utilities.js";
import React, { useState, useEffect } from 'react';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import hljsLLVM from 'react-syntax-highlighter/dist/esm/languages/hljs/llvm';
import hljsDocco from 'react-syntax-highlighter/dist/esm/styles/hljs/docco';
import hljsNightOwl from 'react-syntax-highlighter/dist/esm/styles/hljs/night-owl';

SyntaxHighlighter.registerLanguage('llvm', hljsLLVM);

const useMediaQuery = (query) => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
        return false;
    }

    const mediaQuery = window.matchMedia(query);
    const [match, setMatch] = React.useState(!!mediaQuery.matches);

    React.useEffect(() => {
        const handler = () => setMatch(!!mediaQuery.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return match;
};

class App {
    async load(progressCallback) {
        progressCallback("Loading Parser...");
        /*
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
        */
        // Have to use a web worker here to run in Chrome. https://github.com/wasmerio/wasmer/issues/2792
        this.parser = new MetalLibraryParser_WebWorker(new Worker(new URL('./parser-worker.js', import.meta.url)));
        await this.parser.init();

        progressCallback("Loading Disassembler...");
        let disassemblerModuleData = await fetch(new URL("./llvm-dis.wasm", import.meta.url));
        // Wait for data loading.
        await disassemblerModuleData.clone().blob();
        this.disassembler = new LLVMDisassembler(disassemblerModuleData);

        progressCallback("Ready.");
    }
}

const app = new App();

class DarkModeObserver {
    constructor() {
        this.observers = [];
        this.darkMode = false;
        this.observe();
    }

    observe() {
        if (window.matchMedia) {
            const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQueryList.addEventListener('change', (event) => {
                this.darkMode = event.matches;
                this.observers.forEach(observer => observer(this.darkMode));
            });
        }
    }

    subscribe(observer) {
        this.observers.push(observer);
        observer(this.darkMode);
    }
}

const Spinner = () => <div>Loading...</div>
const ErrorView = ({ error }) => <div>{error.message}</div>

const AssemblyView = (props) => {
    const [ll, setLL] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const f = props.function;
                const bitcode = Utilities.base64Decode(props.archive.bitcodeTable[f.bitcodeID]);
                const ll = await app.disassembler.disassemble(bitcode);
                setLL(ll);
            } catch (error) {
                console.error(error);
            }
        })()
    }, [props]);

    const style = useMediaQuery('(prefers-color-scheme: dark)') ? hljsNightOwl : hljsDocco;

    if (!ll) {
        return <Spinner />;
    } else {
        return <>
            <h3>{props.function.name}</h3>
            <SyntaxHighlighter
                language="llvm"
                style={ style }
                showLineNumbers={true}
                lineNumberStyle={{ opacity: 0.3 }}>
                {ll}
            </SyntaxHighlighter>
        </>
    }
}

const ArchiveView = ({ file }) => {
    const [archive, setArchive] = useState(null);
    const [selectedFunction, setSelectedFunction] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const buffer = await file.arrayBuffer();
                const archive = await app.parser.parse(buffer);
                setSelectedFunction(null);
                setArchive(archive);
            } catch (error) {
                console.error(error);
            }
        })()
    }, [file]);

    if (!archive) {
        return <Spinner />;
    } else {
        return (
            <>
                <div>
                    <h2>Function List</h2>
                    <ul>
                        {archive.functions.map(f => (
                            <li key={f.name} onClick={() => setSelectedFunction(f)}>{f.name}</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h2>Function Assembly</h2>
                    {selectedFunction ? <AssemblyView key={selectedFunction.name} archive={archive} function={selectedFunction} /> : null}
                </div>
            </>
        )
    }
}

export const AppView = () => {
    const [error, setError] = useState(null);
    const [progressInfo, setProgressInfo] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [file, setFile] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                await app.load((progress) => {
                    setProgressInfo(progress);
                });
                setIsReady(true);
            } catch (error) {
                setError(error);
            }
        })()
    }, []);

    if (!isReady) {
        if (error) {
            return <ErrorView error={error} />;
        } else {
            return <>
                <Spinner />
                <div>{progressInfo}</div>
            </>;
        }
    }

    return (
        <>
            <input type="file" id="file-selector" accept=".metallib" onChange={(event) => {
                const fileList = event.target.files;
                if (fileList.length > 0) {
                    setFile(fileList[0]);
                }
            }} />
            {file ? <ArchiveView file={file} /> : null}
        </>
    );
}