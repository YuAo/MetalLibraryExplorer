import { MetalLibraryParser_WebWorker } from "./parser.js";
import { LLVMDisassembler } from "./disassembler.js";
import { Utilities } from "./utilities.js";
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import hljsLLVM from 'react-syntax-highlighter/dist/esm/languages/hljs/llvm';
import hljsDocco from 'react-syntax-highlighter/dist/esm/styles/hljs/docco';
import hljsNightOwl from 'react-syntax-highlighter/dist/esm/styles/hljs/night-owl';

SyntaxHighlighter.registerLanguage('llvm', hljsLLVM);

import "./app.css"

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
        this.disassemblerCache = {};
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

    async parse(buffer) {
        return this.parser.parse(buffer);
    }

    async disassemble(bitcode, hash) {
        const cachedCode = this.disassemblerCache[hash];
        if (cachedCode) {
            return cachedCode;
        } else {
            const code = await this.disassembler.disassemble(bitcode);
            this.disassemblerCache[hash] = code;
            return code;
        }
    }

    async downloadAssemblyArchive(archive, name) {
        var zip = new JSZip();
        var archivedBitcodeHashs = new Set();
        for (const f of archive.functions) {
            if (!archivedBitcodeHashs.has(f.bitcodeID)) {
                const bitcode = Utilities.base64Decode(archive.bitcodeTable[f.bitcodeID]);
                const ll = await this.disassemble(bitcode, f.bitcodeID);
                zip.file(f.name + ".ll", ll);
                archivedBitcodeHashs.add(f.bitcodeID);
            }
        }
        const data = await zip.generateAsync({type:"blob"})
        saveAs(data, name + ".ll.zip");
    }
}

const app = new App();

const SpinnerView = ({ tip }) => <div className="overflow-y-auto h-full w-full">
    <div className="h-full text-center block p-0 bg-slate-50">
        <span className="inline-block align-middle h-full">&#8203;</span>
        <div className="inline-block align-middle overflow-hidden my-8 w-full">
            <div className="loader text-slate-500"></div>
            {tip ? <p className="text-sm text-slate-500">{tip}</p> : null}
        </div>
    </div>
</div>

const ErrorView = ({ title, error, recoveryTitle, recoveryAction }) => <div className="overflow-y-auto h-full w-full">
    <div className="h-full text-center block p-0 bg-slate-50">
        <span className="inline-block align-middle h-full">&#8203;</span>
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{error.message}</p>
                        </div>
                    </div>
                </div>
            </div>
            {recoveryTitle ? <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={recoveryAction}>{recoveryTitle}</button>
            </div> : null}
        </div>
    </div>
</div>


const AssemblyView = (props) => {
    const [error, setError] = useState(null);
    const [ll, setLL] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setError(null);
                setLL(null);
                const bitcode = Utilities.base64Decode(props.archive.bitcodeTable[props.function.bitcodeID]);
                const ll = await app.disassemble(bitcode, props.function.bitcodeID);
                setLL(ll);
            } catch (error) {
                setError(error);
            }
        })();
    }, [props.function.bitcodeID]);


    const fallbackCopyTextToClipboard = (text) => {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    }
    const copyTextToClipboard = (text) => {
        if (!navigator.clipboard) {
            fallbackCopyTextToClipboard(text);
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            console.log('Async: Copying to clipboard was successful!');
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    }

    const copyToClipboard = (event) => {
        var textToCopy = ll;
        var button = event.currentTarget;
        if (button.disabled) { return; }
        var copyText = button.getElementsByClassName('copy-text')[0];
        copyTextToClipboard(textToCopy);
        copyText.innerHTML = 'Copied';
        button.disabled = true;
        window.setTimeout(function () {
            button.disabled = false;
            copyText.innerHTML = 'Copy';
        }, 3000);
    }

    const style = useMediaQuery('(prefers-color-scheme: dark)') ? hljsNightOwl : hljsDocco;

    if (error) {
        return <ErrorView title={`Error disassembling "${props.function.name}"`} error={error} />;
    } else if (ll) {
        return <>
            <div className="flex-none p-6 sticky top-0 w-full backdrop-blur z-50 border-b border-slate-900/10 bg-slate-100 supports-backdrop-blur:bg-slate-100/75 flex gap-4">
                <p className="font-mono font-medium py-1.5 text-slate-900 text-ellipsis overflow-hidden">{`${props.function.name}.ll`}</p>
                <button type="button" className="flex-none flex items-center px-4 py-2 mr-3 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:text-blue-500 focus:z-10 focus:ring-2 focus:ring-gray-300 copy-to-clipboard-button" onClick={copyToClipboard}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <span className="copy-text">Copy</span>
                </button>
            </div>
            <div className="flex-1">
                {
                    ll.length > 64 * 1024 ? <pre className="p-6">{ll}</pre> : <SyntaxHighlighter language="llvm" style={style} showLineNumbers={true} lineNumberStyle={{ opacity: 0.3 }}>{ll}</SyntaxHighlighter>
                }
            </div>
        </>;
    } else {
        return <SpinnerView />;
    }
}

const ArchiveView = ({ file }) => {
    const [error, setError] = useState(null);
    const [archive, setArchive] = useState(null);
    const [selectedFunction, setSelectedFunction] = useState(null);
    const [filter, setFilter] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setError(null);
                setArchive(null);
                setSelectedFunction(null);
                const buffer = await file.arrayBuffer();
                const archive = await app.parse(buffer);
                setArchive(archive);
            } catch (error) {
                setError(error);
            }
        })();
    }, [file]);

    const filterFunctions = (functions, filter) => {
        return functions.filter(f => {
            if (filter && filter.trim().length > 0) {
                return f.name.includes(filter.trim()) || f.type.includes(filter.trim());
            } else {
                return true;
            }
        });
    };

    const formatFileSize = (bytes, si = false, dp = 1) => {
        const thresh = si ? 1000 : 1024;

        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }

        const units = si
            ? ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10 ** dp;

        do {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

        return bytes.toFixed(dp) + ' ' + units[u];
    }

    if (error) {
        return <ErrorView title="Error parsing archive" error={error} />;
    } else if (archive) {
        return (
            <main className="flex flex-row flex-1 h-full overflow-auto">
                <aside className="w-80 flex-none bg-slate-100 h-full overflow-auto border-r border-slate-900/10">
                    <div className="p-6 sticky top-0 w-full backdrop-blur z-50 border-b border-slate-900/10 bg-slate-100 supports-backdrop-blur:bg-slate-100/75">
                        <div className="relative rounded-lg shadow-sm w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="absolute text-slate-400 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                                </svg>
                            </div>
                            <input type="text" placeholder="Search" className="font-sans block text-sm w-full pl-10 py-2 px-3 ring-1 ring-slate-900/10 text-slate-500 rounded-lg" onInput={(e) => { setFilter(e.target.value); }} />
                        </div>
                    </div>
                    <ul className="p-6 space-y-4">
                        <li>
                            <div className="bg-blue-100 rounded-xl text-blue-900 text-sm overflow-hidden">
                                <div className="px-4 py-3 font-medium bg-blue-500 text-white">{file.name}</div>
                                <div className="p-4 space-y-1">
                                    <p><span className="font-bold mr-1">Size:</span><span>{formatFileSize(file.size, true)}</span></p>
                                    <p><span className="font-bold mr-1">Type:</span><span>{archive.type}</span></p>
                                    <p><span className="font-bold mr-1">Targeting:</span><span>{archive.targetPlatform}</span></p>
                                    <p><span className="font-bold mr-1">Functions:</span><span>{archive.functions.length}</span></p>
                                    <div>
                                        <button type="button" class="mt-2 text-white bg-blue-500 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-normal rounded-xl text-sm px-5 py-2.5 focus:outline-none" onClick={() => {
                                            app.downloadAssemblyArchive(archive, file.name);
                                        }}>Download Assembly.zip</button>
                                    </div>
                                </div>
                            </div>
                        </li>
                        {
                            filterFunctions(archive.functions, filter).map(f => {
                                const isSelected = selectedFunction && (f.name == selectedFunction.name);
                                return <li key={f.name}>
                                    <a href="#" className={"block w-full space-y-2 p-4 font-mono rounded-xl " + (isSelected ? "bg-blue-500 hover:bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100 text-slate-900")} onClick={(e) => { setSelectedFunction(f); e.preventDefault(); }}>
                                        <div>
                                            <span className="break-all inline">{f.name}</span>
                                        </div>
                                        <div className="flex flex-row flex-wrap gap-1">
                                            <span className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-gray-300 rounded-full">{f.type}</span>
                                            <span className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-gray-300 rounded-full">{`MSL ${f.languageVersion.major}.${f.languageVersion.minor}`}</span>
                                            <span className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-gray-300 rounded-full">{`BC ${f.bitcodeID.substring(0, 6)}`}</span>
                                        </div>
                                    </a>
                                </li>
                            })
                        }
                    </ul>
                </aside>
                <article className="flex-1 h-full overflow-auto flex flex-col w-full">
                    {selectedFunction ? <AssemblyView key={selectedFunction.name} archive={archive} function={selectedFunction} /> : null}
                </article>
            </main>
        );
    } else {
        return <SpinnerView />;
    }
}

const FullViewport = ({ children, className }) => <div className={"h-screen w-full " + className}>{children}</div>

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
        })();
    }, []);

    if (isReady) {
        return (
            <FullViewport className="flex flex-col bg-slate-50">
                <header className="w-full flex-none flex flex-row px-8 py-5 gap-16 z-50 border-b border-slate-900/10 bg-white/95 items-center">
                    <h1 className="flex-none relative">
                        <span className="text-3xl font-bold mr-2 italic bg-gradient-to-br from-purple-600 to-blue-500 text-transparent bg-clip-text">.metallib</span>
                        <span className="absolute left-0 top-1 text-3xl font-bold mr-1 italic bg-gradient-to-br from-purple-600 to-blue-500 text-transparent bg-clip-text blur-lg">.metallib</span>
                        <span className="text-3xl font-normal text-blue-600">Explorer</span>
                    </h1>
                    <div className="flex-none">
                        <label className="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 shadow-lg shadow-blue-500/50 font-medium rounded-xl text-sm px-5 py-3 text-center block cursor-pointer">
                            <span className="mr-2">Open</span><span className="font-mono">.metallib</span>
                            <input type='file' accept=".metallib" className="hidden" onChange={(event) => {
                                const fileList = event.target.files;
                                if (fileList.length > 0) {
                                    setFile(fileList[0]);
                                }
                            }} />
                        </label>
                    </div>
                </header>
                {file ? <ArchiveView file={file} /> : null}
            </FullViewport>
        );
    } else {
        if (error) {
            return <FullViewport>
                <ErrorView error={error} title="Error loading application" recoveryTitle="Reload" recoveryAction={() => { window.location.reload(); }} />;
            </FullViewport>;
        } else {
            return <FullViewport>
                <SpinnerView tip={progressInfo} />
            </FullViewport>;
        }
    }
}