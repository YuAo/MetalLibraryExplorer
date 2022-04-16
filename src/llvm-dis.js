var Module = (()=>{
  var _scriptDir = import.meta.url;

  return (function(Module) {
      Module = Module || {};

      var Module = typeof Module != "undefined" ? Module : {};
      var readyPromiseResolve, readyPromiseReject;
      Module["ready"] = new Promise(function(resolve, reject) {
          readyPromiseResolve = resolve;
          readyPromiseReject = reject
      }
      );
      var moduleOverrides = Object.assign({}, Module);
      var arguments_ = [];
      var thisProgram = "./this.program";
      var quit_ = (status,toThrow)=>{
          throw toThrow
      }
      ;
      var ENVIRONMENT_IS_WEB = typeof window == "object";
      var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
      var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
      var scriptDirectory = "";
      function locateFile(path) {
          if (Module["locateFile"]) {
              return Module["locateFile"](path, scriptDirectory)
          }
          return scriptDirectory + path
      }
      var read_, readAsync, readBinary, setWindowTitle;
      function logExceptionOnExit(e) {
          if (e instanceof ExitStatus)
              return;
          let toLog = e;
          err("exiting due to exception: " + toLog)
      }
      var fs;
      var nodePath;
      var requireNodeFS;
      if (ENVIRONMENT_IS_NODE) {
          
      } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
          if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = self.location.href
          } else if (typeof document != "undefined" && document.currentScript) {
              scriptDirectory = document.currentScript.src
          }
          if (_scriptDir) {
              scriptDirectory = _scriptDir
          }
          if (scriptDirectory.indexOf("blob:") !== 0) {
              scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1)
          } else {
              scriptDirectory = ""
          }
          {
              read_ = (url=>{
                  var xhr = new XMLHttpRequest;
                  xhr.open("GET", url, false);
                  xhr.send(null);
                  return xhr.responseText
              }
              );
              if (ENVIRONMENT_IS_WORKER) {
                  readBinary = (url=>{
                      var xhr = new XMLHttpRequest;
                      xhr.open("GET", url, false);
                      xhr.responseType = "arraybuffer";
                      xhr.send(null);
                      return new Uint8Array(xhr.response)
                  }
                  )
              }
              readAsync = ((url,onload,onerror)=>{
                  var xhr = new XMLHttpRequest;
                  xhr.open("GET", url, true);
                  xhr.responseType = "arraybuffer";
                  xhr.onload = (()=>{
                      if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                          onload(xhr.response);
                          return
                      }
                      onerror()
                  }
                  );
                  xhr.onerror = onerror;
                  xhr.send(null)
              }
              )
          }
          setWindowTitle = (title=>document.title = title)
      } else {}
      var out = Module["print"] || console.log.bind(console);
      var err = Module["printErr"] || console.warn.bind(console);
      Object.assign(Module, moduleOverrides);
      moduleOverrides = null;
      if (Module["arguments"])
          arguments_ = Module["arguments"];
      if (Module["thisProgram"])
          thisProgram = Module["thisProgram"];
      if (Module["quit"])
          quit_ = Module["quit"];
      var wasmBinary;
      if (Module["wasmBinary"])
          wasmBinary = Module["wasmBinary"];
      var noExitRuntime = Module["noExitRuntime"] || false;
      if (typeof WebAssembly != "object") {
          abort("no native wasm support detected")
      }
      var wasmMemory;
      var ABORT = false;
      var EXITSTATUS;
      function assert(condition, text) {
          if (!condition) {
              abort(text)
          }
      }
      var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;
      function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
          var endIdx = idx + maxBytesToRead;
          var endPtr = idx;
          while (heapOrArray[endPtr] && !(endPtr >= endIdx))
              ++endPtr;
          if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
              return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
          } else {
              var str = "";
              while (idx < endPtr) {
                  var u0 = heapOrArray[idx++];
                  if (!(u0 & 128)) {
                      str += String.fromCharCode(u0);
                      continue
                  }
                  var u1 = heapOrArray[idx++] & 63;
                  if ((u0 & 224) == 192) {
                      str += String.fromCharCode((u0 & 31) << 6 | u1);
                      continue
                  }
                  var u2 = heapOrArray[idx++] & 63;
                  if ((u0 & 240) == 224) {
                      u0 = (u0 & 15) << 12 | u1 << 6 | u2
                  } else {
                      u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63
                  }
                  if (u0 < 65536) {
                      str += String.fromCharCode(u0)
                  } else {
                      var ch = u0 - 65536;
                      str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
                  }
              }
          }
          return str
      }
      function UTF8ToString(ptr, maxBytesToRead) {
          return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
      }
      function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
          if (!(maxBytesToWrite > 0))
              return 0;
          var startIdx = outIdx;
          var endIdx = outIdx + maxBytesToWrite - 1;
          for (var i = 0; i < str.length; ++i) {
              var u = str.charCodeAt(i);
              if (u >= 55296 && u <= 57343) {
                  var u1 = str.charCodeAt(++i);
                  u = 65536 + ((u & 1023) << 10) | u1 & 1023
              }
              if (u <= 127) {
                  if (outIdx >= endIdx)
                      break;
                  heap[outIdx++] = u
              } else if (u <= 2047) {
                  if (outIdx + 1 >= endIdx)
                      break;
                  heap[outIdx++] = 192 | u >> 6;
                  heap[outIdx++] = 128 | u & 63
              } else if (u <= 65535) {
                  if (outIdx + 2 >= endIdx)
                      break;
                  heap[outIdx++] = 224 | u >> 12;
                  heap[outIdx++] = 128 | u >> 6 & 63;
                  heap[outIdx++] = 128 | u & 63
              } else {
                  if (outIdx + 3 >= endIdx)
                      break;
                  heap[outIdx++] = 240 | u >> 18;
                  heap[outIdx++] = 128 | u >> 12 & 63;
                  heap[outIdx++] = 128 | u >> 6 & 63;
                  heap[outIdx++] = 128 | u & 63
              }
          }
          heap[outIdx] = 0;
          return outIdx - startIdx
      }
      function stringToUTF8(str, outPtr, maxBytesToWrite) {
          return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
      }
      function lengthBytesUTF8(str) {
          var len = 0;
          for (var i = 0; i < str.length; ++i) {
              var u = str.charCodeAt(i);
              if (u >= 55296 && u <= 57343)
                  u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
              if (u <= 127)
                  ++len;
              else if (u <= 2047)
                  len += 2;
              else if (u <= 65535)
                  len += 3;
              else
                  len += 4
          }
          return len
      }
      function allocateUTF8OnStack(str) {
          var size = lengthBytesUTF8(str) + 1;
          var ret = stackAlloc(size);
          stringToUTF8Array(str, HEAP8, ret, size);
          return ret
      }
      function writeAsciiToMemory(str, buffer, dontAddNull) {
          for (var i = 0; i < str.length; ++i) {
              HEAP8[buffer++ >> 0] = str.charCodeAt(i)
          }
          if (!dontAddNull)
              HEAP8[buffer >> 0] = 0
      }
      var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
      function updateGlobalBufferAndViews(buf) {
          buffer = buf;
          Module["HEAP8"] = HEAP8 = new Int8Array(buf);
          Module["HEAP16"] = HEAP16 = new Int16Array(buf);
          Module["HEAP32"] = HEAP32 = new Int32Array(buf);
          Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
          Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
          Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
          Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
          Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
      }
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 67108864;
      var wasmTable;
      var __ATPRERUN__ = [];
      var __ATINIT__ = [];
      var __ATMAIN__ = [];
      var __ATEXIT__ = [];
      var __ATPOSTRUN__ = [];
      var runtimeInitialized = false;
      var runtimeExited = false;
      var runtimeKeepaliveCounter = 0;
      function keepRuntimeAlive() {
          return noExitRuntime || runtimeKeepaliveCounter > 0
      }
      function preRun() {
          if (Module["preRun"]) {
              if (typeof Module["preRun"] == "function")
                  Module["preRun"] = [Module["preRun"]];
              while (Module["preRun"].length) {
                  addOnPreRun(Module["preRun"].shift())
              }
          }
          callRuntimeCallbacks(__ATPRERUN__)
      }
      function initRuntime() {
          runtimeInitialized = true;
          if (!Module["noFSInit"] && !FS.init.initialized)
              FS.init();
          FS.ignorePermissions = false;
          TTY.init();
          callRuntimeCallbacks(__ATINIT__)
      }
      function preMain() {
          callRuntimeCallbacks(__ATMAIN__)
      }
      function exitRuntime() {
          ___funcs_on_exit();
          callRuntimeCallbacks(__ATEXIT__);
          FS.quit();
          TTY.shutdown();
          runtimeExited = true
      }
      function postRun() {
          if (Module["postRun"]) {
              if (typeof Module["postRun"] == "function")
                  Module["postRun"] = [Module["postRun"]];
              while (Module["postRun"].length) {
                  addOnPostRun(Module["postRun"].shift())
              }
          }
          callRuntimeCallbacks(__ATPOSTRUN__)
      }
      function addOnPreRun(cb) {
          __ATPRERUN__.unshift(cb)
      }
      function addOnInit(cb) {
          __ATINIT__.unshift(cb)
      }
      function addOnPostRun(cb) {
          __ATPOSTRUN__.unshift(cb)
      }
      var runDependencies = 0;
      var runDependencyWatcher = null;
      var dependenciesFulfilled = null;
      function getUniqueRunDependency(id) {
          return id
      }
      function addRunDependency(id) {
          runDependencies++;
          if (Module["monitorRunDependencies"]) {
              Module["monitorRunDependencies"](runDependencies)
          }
      }
      function removeRunDependency(id) {
          runDependencies--;
          if (Module["monitorRunDependencies"]) {
              Module["monitorRunDependencies"](runDependencies)
          }
          if (runDependencies == 0) {
              if (runDependencyWatcher !== null) {
                  clearInterval(runDependencyWatcher);
                  runDependencyWatcher = null
              }
              if (dependenciesFulfilled) {
                  var callback = dependenciesFulfilled;
                  dependenciesFulfilled = null;
                  callback()
              }
          }
      }
      Module["preloadedImages"] = {};
      Module["preloadedAudios"] = {};
      function abort(what) {
          {
              if (Module["onAbort"]) {
                  Module["onAbort"](what)
              }
          }
          what = "Aborted(" + what + ")";
          err(what);
          ABORT = true;
          EXITSTATUS = 1;
          what += ". Build with -s ASSERTIONS=1 for more info.";
          var e = new WebAssembly.RuntimeError(what);
          readyPromiseReject(e);
          throw e
      }
      var dataURIPrefix = "data:application/octet-stream;base64,";
      function isDataURI(filename) {
          return filename.startsWith(dataURIPrefix)
      }
      function isFileURI(filename) {
          return filename.startsWith("file://")
      }
      var wasmBinaryFile;
      if (Module["locateFile"]) {
          wasmBinaryFile = "llvm-dis.wasm";
          if (!isDataURI(wasmBinaryFile)) {
              wasmBinaryFile = locateFile(wasmBinaryFile)
          }
      } else {
          wasmBinaryFile = new URL("llvm-dis.wasm",import.meta.url).toString()
      }
      function getBinary(file) {
          try {
              if (file == wasmBinaryFile && wasmBinary) {
                  return new Uint8Array(wasmBinary)
              }
              if (readBinary) {
                  return readBinary(file)
              } else {
                  throw "both async and sync fetching of the wasm failed"
              }
          } catch (err) {
              abort(err)
          }
      }
      function getBinaryPromise() {
          if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if (typeof fetch == "function" && !isFileURI(wasmBinaryFile)) {
                  return fetch(wasmBinaryFile, {
                      credentials: "same-origin"
                  }).then(function(response) {
                      if (!response["ok"]) {
                          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                      }
                      return response["arrayBuffer"]()
                  }).catch(function() {
                      return getBinary(wasmBinaryFile)
                  })
              } else {
                  if (readAsync) {
                      return new Promise(function(resolve, reject) {
                          readAsync(wasmBinaryFile, function(response) {
                              resolve(new Uint8Array(response))
                          }, reject)
                      }
                      )
                  }
              }
          }
          return Promise.resolve().then(function() {
              return getBinary(wasmBinaryFile)
          })
      }
      function createWasm() {
          var info = {
              "a": asmLibraryArg
          };
          function receiveInstance(instance, module) {
              var exports = instance.exports;
              Module["asm"] = exports;
              wasmMemory = Module["asm"]["D"];
              updateGlobalBufferAndViews(wasmMemory.buffer);
              wasmTable = Module["asm"]["G"];
              addOnInit(Module["asm"]["E"]);
              removeRunDependency("wasm-instantiate")
          }
          addRunDependency("wasm-instantiate");
          function receiveInstantiationResult(result) {
              receiveInstance(result["instance"])
          }
          function instantiateArrayBuffer(receiver) {
              return getBinaryPromise().then(function(binary) {
                  return WebAssembly.instantiate(binary, info)
              }).then(function(instance) {
                  return instance
              }).then(receiver, function(reason) {
                  err("failed to asynchronously prepare wasm: " + reason);
                  abort(reason)
              })
          }
          function instantiateAsync() {
              if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch == "function") {
                  return fetch(wasmBinaryFile, {
                      credentials: "same-origin"
                  }).then(function(response) {
                      var result = WebAssembly.instantiateStreaming(response, info);
                      return result.then(receiveInstantiationResult, function(reason) {
                          err("wasm streaming compile failed: " + reason);
                          err("falling back to ArrayBuffer instantiation");
                          return instantiateArrayBuffer(receiveInstantiationResult)
                      })
                  })
              } else {
                  return instantiateArrayBuffer(receiveInstantiationResult)
              }
          }
          if (Module["instantiateWasm"]) {
              try {
                  var exports = Module["instantiateWasm"](info, receiveInstance);
                  return exports
              } catch (e) {
                  err("Module.instantiateWasm callback failed with error: " + e);
                  return false
              }
          }
          instantiateAsync().catch(readyPromiseReject);
          return {}
      }
      var tempDouble;
      var tempI64;
      function callRuntimeCallbacks(callbacks) {
          while (callbacks.length > 0) {
              var callback = callbacks.shift();
              if (typeof callback == "function") {
                  callback(Module);
                  continue
              }
              var func = callback.func;
              if (typeof func == "number") {
                  if (callback.arg === undefined) {
                      getWasmTableEntry(func)()
                  } else {
                      getWasmTableEntry(func)(callback.arg)
                  }
              } else {
                  func(callback.arg === undefined ? null : callback.arg)
              }
          }
      }
      var wasmTableMirror = [];
      function getWasmTableEntry(funcPtr) {
          var func = wasmTableMirror[funcPtr];
          if (!func) {
              if (funcPtr >= wasmTableMirror.length)
                  wasmTableMirror.length = funcPtr + 1;
              wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr)
          }
          return func
      }
      function handleException(e) {
          if (e instanceof ExitStatus || e == "unwind") {
              return EXITSTATUS
          }
          quit_(1, e)
      }
      function ___call_sighandler(fp, sig) {
          getWasmTableEntry(fp)(sig)
      }
      var PATH = {
          splitPath: function(filename) {
              var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
              return splitPathRe.exec(filename).slice(1)
          },
          normalizeArray: function(parts, allowAboveRoot) {
              var up = 0;
              for (var i = parts.length - 1; i >= 0; i--) {
                  var last = parts[i];
                  if (last === ".") {
                      parts.splice(i, 1)
                  } else if (last === "..") {
                      parts.splice(i, 1);
                      up++
                  } else if (up) {
                      parts.splice(i, 1);
                      up--
                  }
              }
              if (allowAboveRoot) {
                  for (; up; up--) {
                      parts.unshift("..")
                  }
              }
              return parts
          },
          normalize: function(path) {
              var isAbsolute = path.charAt(0) === "/"
                , trailingSlash = path.substr(-1) === "/";
              path = PATH.normalizeArray(path.split("/").filter(function(p) {
                  return !!p
              }), !isAbsolute).join("/");
              if (!path && !isAbsolute) {
                  path = "."
              }
              if (path && trailingSlash) {
                  path += "/"
              }
              return (isAbsolute ? "/" : "") + path
          },
          dirname: function(path) {
              var result = PATH.splitPath(path)
                , root = result[0]
                , dir = result[1];
              if (!root && !dir) {
                  return "."
              }
              if (dir) {
                  dir = dir.substr(0, dir.length - 1)
              }
              return root + dir
          },
          basename: function(path) {
              if (path === "/")
                  return "/";
              path = PATH.normalize(path);
              path = path.replace(/\/$/, "");
              var lastSlash = path.lastIndexOf("/");
              if (lastSlash === -1)
                  return path;
              return path.substr(lastSlash + 1)
          },
          extname: function(path) {
              return PATH.splitPath(path)[3]
          },
          join: function() {
              var paths = Array.prototype.slice.call(arguments, 0);
              return PATH.normalize(paths.join("/"))
          },
          join2: function(l, r) {
              return PATH.normalize(l + "/" + r)
          }
      };
      function getRandomDevice() {
          if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
              var randomBuffer = new Uint8Array(1);
              return function() {
                  crypto.getRandomValues(randomBuffer);
                  return randomBuffer[0]
              }
          } else if (ENVIRONMENT_IS_NODE) {
              
          }
          return function() {
              abort("randomDevice")
          }
      }
      var PATH_FS = {
          resolve: function() {
              var resolvedPath = ""
                , resolvedAbsolute = false;
              for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                  var path = i >= 0 ? arguments[i] : FS.cwd();
                  if (typeof path != "string") {
                      throw new TypeError("Arguments to path.resolve must be strings")
                  } else if (!path) {
                      return ""
                  }
                  resolvedPath = path + "/" + resolvedPath;
                  resolvedAbsolute = path.charAt(0) === "/"
              }
              resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
                  return !!p
              }), !resolvedAbsolute).join("/");
              return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
          },
          relative: function(from, to) {
              from = PATH_FS.resolve(from).substr(1);
              to = PATH_FS.resolve(to).substr(1);
              function trim(arr) {
                  var start = 0;
                  for (; start < arr.length; start++) {
                      if (arr[start] !== "")
                          break
                  }
                  var end = arr.length - 1;
                  for (; end >= 0; end--) {
                      if (arr[end] !== "")
                          break
                  }
                  if (start > end)
                      return [];
                  return arr.slice(start, end - start + 1)
              }
              var fromParts = trim(from.split("/"));
              var toParts = trim(to.split("/"));
              var length = Math.min(fromParts.length, toParts.length);
              var samePartsLength = length;
              for (var i = 0; i < length; i++) {
                  if (fromParts[i] !== toParts[i]) {
                      samePartsLength = i;
                      break
                  }
              }
              var outputParts = [];
              for (var i = samePartsLength; i < fromParts.length; i++) {
                  outputParts.push("..")
              }
              outputParts = outputParts.concat(toParts.slice(samePartsLength));
              return outputParts.join("/")
          }
      };
      var TTY = {
          ttys: [],
          init: function() {},
          shutdown: function() {},
          register: function(dev, ops) {
              TTY.ttys[dev] = {
                  input: [],
                  output: [],
                  ops: ops
              };
              FS.registerDevice(dev, TTY.stream_ops)
          },
          stream_ops: {
              open: function(stream) {
                  var tty = TTY.ttys[stream.node.rdev];
                  if (!tty) {
                      throw new FS.ErrnoError(43)
                  }
                  stream.tty = tty;
                  stream.seekable = false
              },
              close: function(stream) {
                  stream.tty.ops.flush(stream.tty)
              },
              flush: function(stream) {
                  stream.tty.ops.flush(stream.tty)
              },
              read: function(stream, buffer, offset, length, pos) {
                  if (!stream.tty || !stream.tty.ops.get_char) {
                      throw new FS.ErrnoError(60)
                  }
                  var bytesRead = 0;
                  for (var i = 0; i < length; i++) {
                      var result;
                      try {
                          result = stream.tty.ops.get_char(stream.tty)
                      } catch (e) {
                          throw new FS.ErrnoError(29)
                      }
                      if (result === undefined && bytesRead === 0) {
                          throw new FS.ErrnoError(6)
                      }
                      if (result === null || result === undefined)
                          break;
                      bytesRead++;
                      buffer[offset + i] = result
                  }
                  if (bytesRead) {
                      stream.node.timestamp = Date.now()
                  }
                  return bytesRead
              },
              write: function(stream, buffer, offset, length, pos) {
                  if (!stream.tty || !stream.tty.ops.put_char) {
                      throw new FS.ErrnoError(60)
                  }
                  try {
                      for (var i = 0; i < length; i++) {
                          stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                      }
                  } catch (e) {
                      throw new FS.ErrnoError(29)
                  }
                  if (length) {
                      stream.node.timestamp = Date.now()
                  }
                  return i
              }
          },
          default_tty_ops: {
              get_char: function(tty) {
                  if (!tty.input.length) {
                      var result = null;
                      if (ENVIRONMENT_IS_NODE) {
                          var BUFSIZE = 256;
                          var buf = Buffer.alloc(BUFSIZE);
                          var bytesRead = 0;
                          try {
                              bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE, -1)
                          } catch (e) {
                              if (e.toString().includes("EOF"))
                                  bytesRead = 0;
                              else
                                  throw e
                          }
                          if (bytesRead > 0) {
                              result = buf.slice(0, bytesRead).toString("utf-8")
                          } else {
                              result = null
                          }
                      } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                          result = window.prompt("Input: ");
                          if (result !== null) {
                              result += "\n"
                          }
                      } else if (typeof readline == "function") {
                          result = readline();
                          if (result !== null) {
                              result += "\n"
                          }
                      }
                      if (!result) {
                          return null
                      }
                      tty.input = intArrayFromString(result, true)
                  }
                  return tty.input.shift()
              },
              put_char: function(tty, val) {
                  if (val === null || val === 10) {
                      out(UTF8ArrayToString(tty.output, 0));
                      tty.output = []
                  } else {
                      if (val != 0)
                          tty.output.push(val)
                  }
              },
              flush: function(tty) {
                  if (tty.output && tty.output.length > 0) {
                      out(UTF8ArrayToString(tty.output, 0));
                      tty.output = []
                  }
              }
          },
          default_tty1_ops: {
              put_char: function(tty, val) {
                  if (val === null || val === 10) {
                      err(UTF8ArrayToString(tty.output, 0));
                      tty.output = []
                  } else {
                      if (val != 0)
                          tty.output.push(val)
                  }
              },
              flush: function(tty) {
                  if (tty.output && tty.output.length > 0) {
                      err(UTF8ArrayToString(tty.output, 0));
                      tty.output = []
                  }
              }
          }
      };
      function zeroMemory(address, size) {
          HEAPU8.fill(0, address, address + size)
      }
      function alignMemory(size, alignment) {
          return Math.ceil(size / alignment) * alignment
      }
      function mmapAlloc(size) {
          size = alignMemory(size, 65536);
          var ptr = _emscripten_builtin_memalign(65536, size);
          if (!ptr)
              return 0;
          zeroMemory(ptr, size);
          return ptr
      }
      var MEMFS = {
          ops_table: null,
          mount: function(mount) {
              return MEMFS.createNode(null, "/", 16384 | 511, 0)
          },
          createNode: function(parent, name, mode, dev) {
              if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
                  throw new FS.ErrnoError(63)
              }
              if (!MEMFS.ops_table) {
                  MEMFS.ops_table = {
                      dir: {
                          node: {
                              getattr: MEMFS.node_ops.getattr,
                              setattr: MEMFS.node_ops.setattr,
                              lookup: MEMFS.node_ops.lookup,
                              mknod: MEMFS.node_ops.mknod,
                              rename: MEMFS.node_ops.rename,
                              unlink: MEMFS.node_ops.unlink,
                              rmdir: MEMFS.node_ops.rmdir,
                              readdir: MEMFS.node_ops.readdir,
                              symlink: MEMFS.node_ops.symlink
                          },
                          stream: {
                              llseek: MEMFS.stream_ops.llseek
                          }
                      },
                      file: {
                          node: {
                              getattr: MEMFS.node_ops.getattr,
                              setattr: MEMFS.node_ops.setattr
                          },
                          stream: {
                              llseek: MEMFS.stream_ops.llseek,
                              read: MEMFS.stream_ops.read,
                              write: MEMFS.stream_ops.write,
                              allocate: MEMFS.stream_ops.allocate,
                              mmap: MEMFS.stream_ops.mmap,
                              msync: MEMFS.stream_ops.msync
                          }
                      },
                      link: {
                          node: {
                              getattr: MEMFS.node_ops.getattr,
                              setattr: MEMFS.node_ops.setattr,
                              readlink: MEMFS.node_ops.readlink
                          },
                          stream: {}
                      },
                      chrdev: {
                          node: {
                              getattr: MEMFS.node_ops.getattr,
                              setattr: MEMFS.node_ops.setattr
                          },
                          stream: FS.chrdev_stream_ops
                      }
                  }
              }
              var node = FS.createNode(parent, name, mode, dev);
              if (FS.isDir(node.mode)) {
                  node.node_ops = MEMFS.ops_table.dir.node;
                  node.stream_ops = MEMFS.ops_table.dir.stream;
                  node.contents = {}
              } else if (FS.isFile(node.mode)) {
                  node.node_ops = MEMFS.ops_table.file.node;
                  node.stream_ops = MEMFS.ops_table.file.stream;
                  node.usedBytes = 0;
                  node.contents = null
              } else if (FS.isLink(node.mode)) {
                  node.node_ops = MEMFS.ops_table.link.node;
                  node.stream_ops = MEMFS.ops_table.link.stream
              } else if (FS.isChrdev(node.mode)) {
                  node.node_ops = MEMFS.ops_table.chrdev.node;
                  node.stream_ops = MEMFS.ops_table.chrdev.stream
              }
              node.timestamp = Date.now();
              if (parent) {
                  parent.contents[name] = node;
                  parent.timestamp = node.timestamp
              }
              return node
          },
          getFileDataAsTypedArray: function(node) {
              if (!node.contents)
                  return new Uint8Array(0);
              if (node.contents.subarray)
                  return node.contents.subarray(0, node.usedBytes);
              return new Uint8Array(node.contents)
          },
          expandFileStorage: function(node, newCapacity) {
              var prevCapacity = node.contents ? node.contents.length : 0;
              if (prevCapacity >= newCapacity)
                  return;
              var CAPACITY_DOUBLING_MAX = 1024 * 1024;
              newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
              if (prevCapacity != 0)
                  newCapacity = Math.max(newCapacity, 256);
              var oldContents = node.contents;
              node.contents = new Uint8Array(newCapacity);
              if (node.usedBytes > 0)
                  node.contents.set(oldContents.subarray(0, node.usedBytes), 0)
          },
          resizeFileStorage: function(node, newSize) {
              if (node.usedBytes == newSize)
                  return;
              if (newSize == 0) {
                  node.contents = null;
                  node.usedBytes = 0
              } else {
                  var oldContents = node.contents;
                  node.contents = new Uint8Array(newSize);
                  if (oldContents) {
                      node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
                  }
                  node.usedBytes = newSize
              }
          },
          node_ops: {
              getattr: function(node) {
                  var attr = {};
                  attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
                  attr.ino = node.id;
                  attr.mode = node.mode;
                  attr.nlink = 1;
                  attr.uid = 0;
                  attr.gid = 0;
                  attr.rdev = node.rdev;
                  if (FS.isDir(node.mode)) {
                      attr.size = 4096
                  } else if (FS.isFile(node.mode)) {
                      attr.size = node.usedBytes
                  } else if (FS.isLink(node.mode)) {
                      attr.size = node.link.length
                  } else {
                      attr.size = 0
                  }
                  attr.atime = new Date(node.timestamp);
                  attr.mtime = new Date(node.timestamp);
                  attr.ctime = new Date(node.timestamp);
                  attr.blksize = 4096;
                  attr.blocks = Math.ceil(attr.size / attr.blksize);
                  return attr
              },
              setattr: function(node, attr) {
                  if (attr.mode !== undefined) {
                      node.mode = attr.mode
                  }
                  if (attr.timestamp !== undefined) {
                      node.timestamp = attr.timestamp
                  }
                  if (attr.size !== undefined) {
                      MEMFS.resizeFileStorage(node, attr.size)
                  }
              },
              lookup: function(parent, name) {
                  throw FS.genericErrors[44]
              },
              mknod: function(parent, name, mode, dev) {
                  return MEMFS.createNode(parent, name, mode, dev)
              },
              rename: function(old_node, new_dir, new_name) {
                  if (FS.isDir(old_node.mode)) {
                      var new_node;
                      try {
                          new_node = FS.lookupNode(new_dir, new_name)
                      } catch (e) {}
                      if (new_node) {
                          for (var i in new_node.contents) {
                              throw new FS.ErrnoError(55)
                          }
                      }
                  }
                  delete old_node.parent.contents[old_node.name];
                  old_node.parent.timestamp = Date.now();
                  old_node.name = new_name;
                  new_dir.contents[new_name] = old_node;
                  new_dir.timestamp = old_node.parent.timestamp;
                  old_node.parent = new_dir
              },
              unlink: function(parent, name) {
                  delete parent.contents[name];
                  parent.timestamp = Date.now()
              },
              rmdir: function(parent, name) {
                  var node = FS.lookupNode(parent, name);
                  for (var i in node.contents) {
                      throw new FS.ErrnoError(55)
                  }
                  delete parent.contents[name];
                  parent.timestamp = Date.now()
              },
              readdir: function(node) {
                  var entries = [".", ".."];
                  for (var key in node.contents) {
                      if (!node.contents.hasOwnProperty(key)) {
                          continue
                      }
                      entries.push(key)
                  }
                  return entries
              },
              symlink: function(parent, newname, oldpath) {
                  var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
                  node.link = oldpath;
                  return node
              },
              readlink: function(node) {
                  if (!FS.isLink(node.mode)) {
                      throw new FS.ErrnoError(28)
                  }
                  return node.link
              }
          },
          stream_ops: {
              read: function(stream, buffer, offset, length, position) {
                  var contents = stream.node.contents;
                  if (position >= stream.node.usedBytes)
                      return 0;
                  var size = Math.min(stream.node.usedBytes - position, length);
                  if (size > 8 && contents.subarray) {
                      buffer.set(contents.subarray(position, position + size), offset)
                  } else {
                      for (var i = 0; i < size; i++)
                          buffer[offset + i] = contents[position + i]
                  }
                  return size
              },
              write: function(stream, buffer, offset, length, position, canOwn) {
                  if (buffer.buffer === HEAP8.buffer) {
                      canOwn = false
                  }
                  if (!length)
                      return 0;
                  var node = stream.node;
                  node.timestamp = Date.now();
                  if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                      if (canOwn) {
                          node.contents = buffer.subarray(offset, offset + length);
                          node.usedBytes = length;
                          return length
                      } else if (node.usedBytes === 0 && position === 0) {
                          node.contents = buffer.slice(offset, offset + length);
                          node.usedBytes = length;
                          return length
                      } else if (position + length <= node.usedBytes) {
                          node.contents.set(buffer.subarray(offset, offset + length), position);
                          return length
                      }
                  }
                  MEMFS.expandFileStorage(node, position + length);
                  if (node.contents.subarray && buffer.subarray) {
                      node.contents.set(buffer.subarray(offset, offset + length), position)
                  } else {
                      for (var i = 0; i < length; i++) {
                          node.contents[position + i] = buffer[offset + i]
                      }
                  }
                  node.usedBytes = Math.max(node.usedBytes, position + length);
                  return length
              },
              llseek: function(stream, offset, whence) {
                  var position = offset;
                  if (whence === 1) {
                      position += stream.position
                  } else if (whence === 2) {
                      if (FS.isFile(stream.node.mode)) {
                          position += stream.node.usedBytes
                      }
                  }
                  if (position < 0) {
                      throw new FS.ErrnoError(28)
                  }
                  return position
              },
              allocate: function(stream, offset, length) {
                  MEMFS.expandFileStorage(stream.node, offset + length);
                  stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
              },
              mmap: function(stream, address, length, position, prot, flags) {
                  if (address !== 0) {
                      throw new FS.ErrnoError(28)
                  }
                  if (!FS.isFile(stream.node.mode)) {
                      throw new FS.ErrnoError(43)
                  }
                  var ptr;
                  var allocated;
                  var contents = stream.node.contents;
                  if (!(flags & 2) && contents.buffer === buffer) {
                      allocated = false;
                      ptr = contents.byteOffset
                  } else {
                      if (position > 0 || position + length < contents.length) {
                          if (contents.subarray) {
                              contents = contents.subarray(position, position + length)
                          } else {
                              contents = Array.prototype.slice.call(contents, position, position + length)
                          }
                      }
                      allocated = true;
                      ptr = mmapAlloc(length);
                      if (!ptr) {
                          throw new FS.ErrnoError(48)
                      }
                      HEAP8.set(contents, ptr)
                  }
                  return {
                      ptr: ptr,
                      allocated: allocated
                  }
              },
              msync: function(stream, buffer, offset, length, mmapFlags) {
                  if (!FS.isFile(stream.node.mode)) {
                      throw new FS.ErrnoError(43)
                  }
                  if (mmapFlags & 2) {
                      return 0
                  }
                  var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
                  return 0
              }
          }
      };
      function asyncLoad(url, onload, onerror, noRunDep) {
          var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
          readAsync(url, function(arrayBuffer) {
              assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
              onload(new Uint8Array(arrayBuffer));
              if (dep)
                  removeRunDependency(dep)
          }, function(event) {
              if (onerror) {
                  onerror()
              } else {
                  throw 'Loading data file "' + url + '" failed.'
              }
          });
          if (dep)
              addRunDependency(dep)
      }
      var FS = {
          root: null,
          mounts: [],
          devices: {},
          streams: [],
          nextInode: 1,
          nameTable: null,
          currentPath: "/",
          initialized: false,
          ignorePermissions: true,
          ErrnoError: null,
          genericErrors: {},
          filesystems: null,
          syncFSRequests: 0,
          lookupPath: (path,opts={})=>{
              path = PATH_FS.resolve(FS.cwd(), path);
              if (!path)
                  return {
                      path: "",
                      node: null
                  };
              var defaults = {
                  follow_mount: true,
                  recurse_count: 0
              };
              opts = Object.assign(defaults, opts);
              if (opts.recurse_count > 8) {
                  throw new FS.ErrnoError(32)
              }
              var parts = PATH.normalizeArray(path.split("/").filter(p=>!!p), false);
              var current = FS.root;
              var current_path = "/";
              for (var i = 0; i < parts.length; i++) {
                  var islast = i === parts.length - 1;
                  if (islast && opts.parent) {
                      break
                  }
                  current = FS.lookupNode(current, parts[i]);
                  current_path = PATH.join2(current_path, parts[i]);
                  if (FS.isMountpoint(current)) {
                      if (!islast || islast && opts.follow_mount) {
                          current = current.mounted.root
                      }
                  }
                  if (!islast || opts.follow) {
                      var count = 0;
                      while (FS.isLink(current.mode)) {
                          var link = FS.readlink(current_path);
                          current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                          var lookup = FS.lookupPath(current_path, {
                              recurse_count: opts.recurse_count + 1
                          });
                          current = lookup.node;
                          if (count++ > 40) {
                              throw new FS.ErrnoError(32)
                          }
                      }
                  }
              }
              return {
                  path: current_path,
                  node: current
              }
          }
          ,
          getPath: node=>{
              var path;
              while (true) {
                  if (FS.isRoot(node)) {
                      var mount = node.mount.mountpoint;
                      if (!path)
                          return mount;
                      return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
                  }
                  path = path ? node.name + "/" + path : node.name;
                  node = node.parent
              }
          }
          ,
          hashName: (parentid,name)=>{
              var hash = 0;
              for (var i = 0; i < name.length; i++) {
                  hash = (hash << 5) - hash + name.charCodeAt(i) | 0
              }
              return (parentid + hash >>> 0) % FS.nameTable.length
          }
          ,
          hashAddNode: node=>{
              var hash = FS.hashName(node.parent.id, node.name);
              node.name_next = FS.nameTable[hash];
              FS.nameTable[hash] = node
          }
          ,
          hashRemoveNode: node=>{
              var hash = FS.hashName(node.parent.id, node.name);
              if (FS.nameTable[hash] === node) {
                  FS.nameTable[hash] = node.name_next
              } else {
                  var current = FS.nameTable[hash];
                  while (current) {
                      if (current.name_next === node) {
                          current.name_next = node.name_next;
                          break
                      }
                      current = current.name_next
                  }
              }
          }
          ,
          lookupNode: (parent,name)=>{
              var errCode = FS.mayLookup(parent);
              if (errCode) {
                  throw new FS.ErrnoError(errCode,parent)
              }
              var hash = FS.hashName(parent.id, name);
              for (var node = FS.nameTable[hash]; node; node = node.name_next) {
                  var nodeName = node.name;
                  if (node.parent.id === parent.id && nodeName === name) {
                      return node
                  }
              }
              return FS.lookup(parent, name)
          }
          ,
          createNode: (parent,name,mode,rdev)=>{
              var node = new FS.FSNode(parent,name,mode,rdev);
              FS.hashAddNode(node);
              return node
          }
          ,
          destroyNode: node=>{
              FS.hashRemoveNode(node)
          }
          ,
          isRoot: node=>{
              return node === node.parent
          }
          ,
          isMountpoint: node=>{
              return !!node.mounted
          }
          ,
          isFile: mode=>{
              return (mode & 61440) === 32768
          }
          ,
          isDir: mode=>{
              return (mode & 61440) === 16384
          }
          ,
          isLink: mode=>{
              return (mode & 61440) === 40960
          }
          ,
          isChrdev: mode=>{
              return (mode & 61440) === 8192
          }
          ,
          isBlkdev: mode=>{
              return (mode & 61440) === 24576
          }
          ,
          isFIFO: mode=>{
              return (mode & 61440) === 4096
          }
          ,
          isSocket: mode=>{
              return (mode & 49152) === 49152
          }
          ,
          flagModes: {
              "r": 0,
              "r+": 2,
              "w": 577,
              "w+": 578,
              "a": 1089,
              "a+": 1090
          },
          modeStringToFlags: str=>{
              var flags = FS.flagModes[str];
              if (typeof flags == "undefined") {
                  throw new Error("Unknown file open mode: " + str)
              }
              return flags
          }
          ,
          flagsToPermissionString: flag=>{
              var perms = ["r", "w", "rw"][flag & 3];
              if (flag & 512) {
                  perms += "w"
              }
              return perms
          }
          ,
          nodePermissions: (node,perms)=>{
              if (FS.ignorePermissions) {
                  return 0
              }
              if (perms.includes("r") && !(node.mode & 292)) {
                  return 2
              } else if (perms.includes("w") && !(node.mode & 146)) {
                  return 2
              } else if (perms.includes("x") && !(node.mode & 73)) {
                  return 2
              }
              return 0
          }
          ,
          mayLookup: dir=>{
              var errCode = FS.nodePermissions(dir, "x");
              if (errCode)
                  return errCode;
              if (!dir.node_ops.lookup)
                  return 2;
              return 0
          }
          ,
          mayCreate: (dir,name)=>{
              try {
                  var node = FS.lookupNode(dir, name);
                  return 20
              } catch (e) {}
              return FS.nodePermissions(dir, "wx")
          }
          ,
          mayDelete: (dir,name,isdir)=>{
              var node;
              try {
                  node = FS.lookupNode(dir, name)
              } catch (e) {
                  return e.errno
              }
              var errCode = FS.nodePermissions(dir, "wx");
              if (errCode) {
                  return errCode
              }
              if (isdir) {
                  if (!FS.isDir(node.mode)) {
                      return 54
                  }
                  if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                      return 10
                  }
              } else {
                  if (FS.isDir(node.mode)) {
                      return 31
                  }
              }
              return 0
          }
          ,
          mayOpen: (node,flags)=>{
              if (!node) {
                  return 44
              }
              if (FS.isLink(node.mode)) {
                  return 32
              } else if (FS.isDir(node.mode)) {
                  if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                      return 31
                  }
              }
              return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
          }
          ,
          MAX_OPEN_FDS: 4096,
          nextfd: (fd_start=0,fd_end=FS.MAX_OPEN_FDS)=>{
              for (var fd = fd_start; fd <= fd_end; fd++) {
                  if (!FS.streams[fd]) {
                      return fd
                  }
              }
              throw new FS.ErrnoError(33)
          }
          ,
          getStream: fd=>FS.streams[fd],
          createStream: (stream,fd_start,fd_end)=>{
              if (!FS.FSStream) {
                  FS.FSStream = function() {}
                  ;
                  FS.FSStream.prototype = {
                      object: {
                          get: function() {
                              return this.node
                          },
                          set: function(val) {
                              this.node = val
                          }
                      },
                      isRead: {
                          get: function() {
                              return (this.flags & 2097155) !== 1
                          }
                      },
                      isWrite: {
                          get: function() {
                              return (this.flags & 2097155) !== 0
                          }
                      },
                      isAppend: {
                          get: function() {
                              return this.flags & 1024
                          }
                      }
                  }
              }
              stream = Object.assign(new FS.FSStream, stream);
              var fd = FS.nextfd(fd_start, fd_end);
              stream.fd = fd;
              FS.streams[fd] = stream;
              return stream
          }
          ,
          closeStream: fd=>{
              FS.streams[fd] = null
          }
          ,
          chrdev_stream_ops: {
              open: stream=>{
                  var device = FS.getDevice(stream.node.rdev);
                  stream.stream_ops = device.stream_ops;
                  if (stream.stream_ops.open) {
                      stream.stream_ops.open(stream)
                  }
              }
              ,
              llseek: ()=>{
                  throw new FS.ErrnoError(70)
              }
          },
          major: dev=>dev >> 8,
          minor: dev=>dev & 255,
          makedev: (ma,mi)=>ma << 8 | mi,
          registerDevice: (dev,ops)=>{
              FS.devices[dev] = {
                  stream_ops: ops
              }
          }
          ,
          getDevice: dev=>FS.devices[dev],
          getMounts: mount=>{
              var mounts = [];
              var check = [mount];
              while (check.length) {
                  var m = check.pop();
                  mounts.push(m);
                  check.push.apply(check, m.mounts)
              }
              return mounts
          }
          ,
          syncfs: (populate,callback)=>{
              if (typeof populate == "function") {
                  callback = populate;
                  populate = false
              }
              FS.syncFSRequests++;
              if (FS.syncFSRequests > 1) {
                  err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
              }
              var mounts = FS.getMounts(FS.root.mount);
              var completed = 0;
              function doCallback(errCode) {
                  FS.syncFSRequests--;
                  return callback(errCode)
              }
              function done(errCode) {
                  if (errCode) {
                      if (!done.errored) {
                          done.errored = true;
                          return doCallback(errCode)
                      }
                      return
                  }
                  if (++completed >= mounts.length) {
                      doCallback(null)
                  }
              }
              mounts.forEach(mount=>{
                  if (!mount.type.syncfs) {
                      return done(null)
                  }
                  mount.type.syncfs(mount, populate, done)
              }
              )
          }
          ,
          mount: (type,opts,mountpoint)=>{
              var root = mountpoint === "/";
              var pseudo = !mountpoint;
              var node;
              if (root && FS.root) {
                  throw new FS.ErrnoError(10)
              } else if (!root && !pseudo) {
                  var lookup = FS.lookupPath(mountpoint, {
                      follow_mount: false
                  });
                  mountpoint = lookup.path;
                  node = lookup.node;
                  if (FS.isMountpoint(node)) {
                      throw new FS.ErrnoError(10)
                  }
                  if (!FS.isDir(node.mode)) {
                      throw new FS.ErrnoError(54)
                  }
              }
              var mount = {
                  type: type,
                  opts: opts,
                  mountpoint: mountpoint,
                  mounts: []
              };
              var mountRoot = type.mount(mount);
              mountRoot.mount = mount;
              mount.root = mountRoot;
              if (root) {
                  FS.root = mountRoot
              } else if (node) {
                  node.mounted = mount;
                  if (node.mount) {
                      node.mount.mounts.push(mount)
                  }
              }
              return mountRoot
          }
          ,
          unmount: mountpoint=>{
              var lookup = FS.lookupPath(mountpoint, {
                  follow_mount: false
              });
              if (!FS.isMountpoint(lookup.node)) {
                  throw new FS.ErrnoError(28)
              }
              var node = lookup.node;
              var mount = node.mounted;
              var mounts = FS.getMounts(mount);
              Object.keys(FS.nameTable).forEach(hash=>{
                  var current = FS.nameTable[hash];
                  while (current) {
                      var next = current.name_next;
                      if (mounts.includes(current.mount)) {
                          FS.destroyNode(current)
                      }
                      current = next
                  }
              }
              );
              node.mounted = null;
              var idx = node.mount.mounts.indexOf(mount);
              node.mount.mounts.splice(idx, 1)
          }
          ,
          lookup: (parent,name)=>{
              return parent.node_ops.lookup(parent, name)
          }
          ,
          mknod: (path,mode,dev)=>{
              var lookup = FS.lookupPath(path, {
                  parent: true
              });
              var parent = lookup.node;
              var name = PATH.basename(path);
              if (!name || name === "." || name === "..") {
                  throw new FS.ErrnoError(28)
              }
              var errCode = FS.mayCreate(parent, name);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              if (!parent.node_ops.mknod) {
                  throw new FS.ErrnoError(63)
              }
              return parent.node_ops.mknod(parent, name, mode, dev)
          }
          ,
          create: (path,mode)=>{
              mode = mode !== undefined ? mode : 438;
              mode &= 4095;
              mode |= 32768;
              return FS.mknod(path, mode, 0)
          }
          ,
          mkdir: (path,mode)=>{
              mode = mode !== undefined ? mode : 511;
              mode &= 511 | 512;
              mode |= 16384;
              return FS.mknod(path, mode, 0)
          }
          ,
          mkdirTree: (path,mode)=>{
              var dirs = path.split("/");
              var d = "";
              for (var i = 0; i < dirs.length; ++i) {
                  if (!dirs[i])
                      continue;
                  d += "/" + dirs[i];
                  try {
                      FS.mkdir(d, mode)
                  } catch (e) {
                      if (e.errno != 20)
                          throw e
                  }
              }
          }
          ,
          mkdev: (path,mode,dev)=>{
              if (typeof dev == "undefined") {
                  dev = mode;
                  mode = 438
              }
              mode |= 8192;
              return FS.mknod(path, mode, dev)
          }
          ,
          symlink: (oldpath,newpath)=>{
              if (!PATH_FS.resolve(oldpath)) {
                  throw new FS.ErrnoError(44)
              }
              var lookup = FS.lookupPath(newpath, {
                  parent: true
              });
              var parent = lookup.node;
              if (!parent) {
                  throw new FS.ErrnoError(44)
              }
              var newname = PATH.basename(newpath);
              var errCode = FS.mayCreate(parent, newname);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              if (!parent.node_ops.symlink) {
                  throw new FS.ErrnoError(63)
              }
              return parent.node_ops.symlink(parent, newname, oldpath)
          }
          ,
          rename: (old_path,new_path)=>{
              var old_dirname = PATH.dirname(old_path);
              var new_dirname = PATH.dirname(new_path);
              var old_name = PATH.basename(old_path);
              var new_name = PATH.basename(new_path);
              var lookup, old_dir, new_dir;
              lookup = FS.lookupPath(old_path, {
                  parent: true
              });
              old_dir = lookup.node;
              lookup = FS.lookupPath(new_path, {
                  parent: true
              });
              new_dir = lookup.node;
              if (!old_dir || !new_dir)
                  throw new FS.ErrnoError(44);
              if (old_dir.mount !== new_dir.mount) {
                  throw new FS.ErrnoError(75)
              }
              var old_node = FS.lookupNode(old_dir, old_name);
              var relative = PATH_FS.relative(old_path, new_dirname);
              if (relative.charAt(0) !== ".") {
                  throw new FS.ErrnoError(28)
              }
              relative = PATH_FS.relative(new_path, old_dirname);
              if (relative.charAt(0) !== ".") {
                  throw new FS.ErrnoError(55)
              }
              var new_node;
              try {
                  new_node = FS.lookupNode(new_dir, new_name)
              } catch (e) {}
              if (old_node === new_node) {
                  return
              }
              var isdir = FS.isDir(old_node.mode);
              var errCode = FS.mayDelete(old_dir, old_name, isdir);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              if (!old_dir.node_ops.rename) {
                  throw new FS.ErrnoError(63)
              }
              if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
                  throw new FS.ErrnoError(10)
              }
              if (new_dir !== old_dir) {
                  errCode = FS.nodePermissions(old_dir, "w");
                  if (errCode) {
                      throw new FS.ErrnoError(errCode)
                  }
              }
              FS.hashRemoveNode(old_node);
              try {
                  old_dir.node_ops.rename(old_node, new_dir, new_name)
              } catch (e) {
                  throw e
              } finally {
                  FS.hashAddNode(old_node)
              }
          }
          ,
          rmdir: path=>{
              var lookup = FS.lookupPath(path, {
                  parent: true
              });
              var parent = lookup.node;
              var name = PATH.basename(path);
              var node = FS.lookupNode(parent, name);
              var errCode = FS.mayDelete(parent, name, true);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              if (!parent.node_ops.rmdir) {
                  throw new FS.ErrnoError(63)
              }
              if (FS.isMountpoint(node)) {
                  throw new FS.ErrnoError(10)
              }
              parent.node_ops.rmdir(parent, name);
              FS.destroyNode(node)
          }
          ,
          readdir: path=>{
              var lookup = FS.lookupPath(path, {
                  follow: true
              });
              var node = lookup.node;
              if (!node.node_ops.readdir) {
                  throw new FS.ErrnoError(54)
              }
              return node.node_ops.readdir(node)
          }
          ,
          unlink: path=>{
              var lookup = FS.lookupPath(path, {
                  parent: true
              });
              var parent = lookup.node;
              if (!parent) {
                  throw new FS.ErrnoError(44)
              }
              var name = PATH.basename(path);
              var node = FS.lookupNode(parent, name);
              var errCode = FS.mayDelete(parent, name, false);
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              if (!parent.node_ops.unlink) {
                  throw new FS.ErrnoError(63)
              }
              if (FS.isMountpoint(node)) {
                  throw new FS.ErrnoError(10)
              }
              parent.node_ops.unlink(parent, name);
              FS.destroyNode(node)
          }
          ,
          readlink: path=>{
              var lookup = FS.lookupPath(path);
              var link = lookup.node;
              if (!link) {
                  throw new FS.ErrnoError(44)
              }
              if (!link.node_ops.readlink) {
                  throw new FS.ErrnoError(28)
              }
              return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
          }
          ,
          stat: (path,dontFollow)=>{
              var lookup = FS.lookupPath(path, {
                  follow: !dontFollow
              });
              var node = lookup.node;
              if (!node) {
                  throw new FS.ErrnoError(44)
              }
              if (!node.node_ops.getattr) {
                  throw new FS.ErrnoError(63)
              }
              return node.node_ops.getattr(node)
          }
          ,
          lstat: path=>{
              return FS.stat(path, true)
          }
          ,
          chmod: (path,mode,dontFollow)=>{
              var node;
              if (typeof path == "string") {
                  var lookup = FS.lookupPath(path, {
                      follow: !dontFollow
                  });
                  node = lookup.node
              } else {
                  node = path
              }
              if (!node.node_ops.setattr) {
                  throw new FS.ErrnoError(63)
              }
              node.node_ops.setattr(node, {
                  mode: mode & 4095 | node.mode & ~4095,
                  timestamp: Date.now()
              })
          }
          ,
          lchmod: (path,mode)=>{
              FS.chmod(path, mode, true)
          }
          ,
          fchmod: (fd,mode)=>{
              var stream = FS.getStream(fd);
              if (!stream) {
                  throw new FS.ErrnoError(8)
              }
              FS.chmod(stream.node, mode)
          }
          ,
          chown: (path,uid,gid,dontFollow)=>{
              var node;
              if (typeof path == "string") {
                  var lookup = FS.lookupPath(path, {
                      follow: !dontFollow
                  });
                  node = lookup.node
              } else {
                  node = path
              }
              if (!node.node_ops.setattr) {
                  throw new FS.ErrnoError(63)
              }
              node.node_ops.setattr(node, {
                  timestamp: Date.now()
              })
          }
          ,
          lchown: (path,uid,gid)=>{
              FS.chown(path, uid, gid, true)
          }
          ,
          fchown: (fd,uid,gid)=>{
              var stream = FS.getStream(fd);
              if (!stream) {
                  throw new FS.ErrnoError(8)
              }
              FS.chown(stream.node, uid, gid)
          }
          ,
          truncate: (path,len)=>{
              if (len < 0) {
                  throw new FS.ErrnoError(28)
              }
              var node;
              if (typeof path == "string") {
                  var lookup = FS.lookupPath(path, {
                      follow: true
                  });
                  node = lookup.node
              } else {
                  node = path
              }
              if (!node.node_ops.setattr) {
                  throw new FS.ErrnoError(63)
              }
              if (FS.isDir(node.mode)) {
                  throw new FS.ErrnoError(31)
              }
              if (!FS.isFile(node.mode)) {
                  throw new FS.ErrnoError(28)
              }
              var errCode = FS.nodePermissions(node, "w");
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              node.node_ops.setattr(node, {
                  size: len,
                  timestamp: Date.now()
              })
          }
          ,
          ftruncate: (fd,len)=>{
              var stream = FS.getStream(fd);
              if (!stream) {
                  throw new FS.ErrnoError(8)
              }
              if ((stream.flags & 2097155) === 0) {
                  throw new FS.ErrnoError(28)
              }
              FS.truncate(stream.node, len)
          }
          ,
          utime: (path,atime,mtime)=>{
              var lookup = FS.lookupPath(path, {
                  follow: true
              });
              var node = lookup.node;
              node.node_ops.setattr(node, {
                  timestamp: Math.max(atime, mtime)
              })
          }
          ,
          open: (path,flags,mode,fd_start,fd_end)=>{
              if (path === "") {
                  throw new FS.ErrnoError(44)
              }
              flags = typeof flags == "string" ? FS.modeStringToFlags(flags) : flags;
              mode = typeof mode == "undefined" ? 438 : mode;
              if (flags & 64) {
                  mode = mode & 4095 | 32768
              } else {
                  mode = 0
              }
              var node;
              if (typeof path == "object") {
                  node = path
              } else {
                  path = PATH.normalize(path);
                  try {
                      var lookup = FS.lookupPath(path, {
                          follow: !(flags & 131072)
                      });
                      node = lookup.node
                  } catch (e) {}
              }
              var created = false;
              if (flags & 64) {
                  if (node) {
                      if (flags & 128) {
                          throw new FS.ErrnoError(20)
                      }
                  } else {
                      node = FS.mknod(path, mode, 0);
                      created = true
                  }
              }
              if (!node) {
                  throw new FS.ErrnoError(44)
              }
              if (FS.isChrdev(node.mode)) {
                  flags &= ~512
              }
              if (flags & 65536 && !FS.isDir(node.mode)) {
                  throw new FS.ErrnoError(54)
              }
              if (!created) {
                  var errCode = FS.mayOpen(node, flags);
                  if (errCode) {
                      throw new FS.ErrnoError(errCode)
                  }
              }
              if (flags & 512) {
                  FS.truncate(node, 0)
              }
              flags &= ~(128 | 512 | 131072);
              var stream = FS.createStream({
                  node: node,
                  path: FS.getPath(node),
                  flags: flags,
                  seekable: true,
                  position: 0,
                  stream_ops: node.stream_ops,
                  ungotten: [],
                  error: false
              }, fd_start, fd_end);
              if (stream.stream_ops.open) {
                  stream.stream_ops.open(stream)
              }
              if (Module["logReadFiles"] && !(flags & 1)) {
                  if (!FS.readFiles)
                      FS.readFiles = {};
                  if (!(path in FS.readFiles)) {
                      FS.readFiles[path] = 1
                  }
              }
              return stream
          }
          ,
          close: stream=>{
              if (FS.isClosed(stream)) {
                  throw new FS.ErrnoError(8)
              }
              if (stream.getdents)
                  stream.getdents = null;
              try {
                  if (stream.stream_ops.close) {
                      stream.stream_ops.close(stream)
                  }
              } catch (e) {
                  throw e
              } finally {
                  FS.closeStream(stream.fd)
              }
              stream.fd = null
          }
          ,
          isClosed: stream=>{
              return stream.fd === null
          }
          ,
          llseek: (stream,offset,whence)=>{
              if (FS.isClosed(stream)) {
                  throw new FS.ErrnoError(8)
              }
              if (!stream.seekable || !stream.stream_ops.llseek) {
                  throw new FS.ErrnoError(70)
              }
              if (whence != 0 && whence != 1 && whence != 2) {
                  throw new FS.ErrnoError(28)
              }
              stream.position = stream.stream_ops.llseek(stream, offset, whence);
              stream.ungotten = [];
              return stream.position
          }
          ,
          read: (stream,buffer,offset,length,position)=>{
              if (length < 0 || position < 0) {
                  throw new FS.ErrnoError(28)
              }
              if (FS.isClosed(stream)) {
                  throw new FS.ErrnoError(8)
              }
              if ((stream.flags & 2097155) === 1) {
                  throw new FS.ErrnoError(8)
              }
              if (FS.isDir(stream.node.mode)) {
                  throw new FS.ErrnoError(31)
              }
              if (!stream.stream_ops.read) {
                  throw new FS.ErrnoError(28)
              }
              var seeking = typeof position != "undefined";
              if (!seeking) {
                  position = stream.position
              } else if (!stream.seekable) {
                  throw new FS.ErrnoError(70)
              }
              var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
              if (!seeking)
                  stream.position += bytesRead;
              return bytesRead
          }
          ,
          write: (stream,buffer,offset,length,position,canOwn)=>{
              if (length < 0 || position < 0) {
                  throw new FS.ErrnoError(28)
              }
              if (FS.isClosed(stream)) {
                  throw new FS.ErrnoError(8)
              }
              if ((stream.flags & 2097155) === 0) {
                  throw new FS.ErrnoError(8)
              }
              if (FS.isDir(stream.node.mode)) {
                  throw new FS.ErrnoError(31)
              }
              if (!stream.stream_ops.write) {
                  throw new FS.ErrnoError(28)
              }
              if (stream.seekable && stream.flags & 1024) {
                  FS.llseek(stream, 0, 2)
              }
              var seeking = typeof position != "undefined";
              if (!seeking) {
                  position = stream.position
              } else if (!stream.seekable) {
                  throw new FS.ErrnoError(70)
              }
              var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
              if (!seeking)
                  stream.position += bytesWritten;
              return bytesWritten
          }
          ,
          allocate: (stream,offset,length)=>{
              if (FS.isClosed(stream)) {
                  throw new FS.ErrnoError(8)
              }
              if (offset < 0 || length <= 0) {
                  throw new FS.ErrnoError(28)
              }
              if ((stream.flags & 2097155) === 0) {
                  throw new FS.ErrnoError(8)
              }
              if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
                  throw new FS.ErrnoError(43)
              }
              if (!stream.stream_ops.allocate) {
                  throw new FS.ErrnoError(138)
              }
              stream.stream_ops.allocate(stream, offset, length)
          }
          ,
          mmap: (stream,address,length,position,prot,flags)=>{
              if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
                  throw new FS.ErrnoError(2)
              }
              if ((stream.flags & 2097155) === 1) {
                  throw new FS.ErrnoError(2)
              }
              if (!stream.stream_ops.mmap) {
                  throw new FS.ErrnoError(43)
              }
              return stream.stream_ops.mmap(stream, address, length, position, prot, flags)
          }
          ,
          msync: (stream,buffer,offset,length,mmapFlags)=>{
              if (!stream || !stream.stream_ops.msync) {
                  return 0
              }
              return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
          }
          ,
          munmap: stream=>0,
          ioctl: (stream,cmd,arg)=>{
              if (!stream.stream_ops.ioctl) {
                  throw new FS.ErrnoError(59)
              }
              return stream.stream_ops.ioctl(stream, cmd, arg)
          }
          ,
          readFile: (path,opts={})=>{
              opts.flags = opts.flags || 0;
              opts.encoding = opts.encoding || "binary";
              if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
                  throw new Error('Invalid encoding type "' + opts.encoding + '"')
              }
              var ret;
              var stream = FS.open(path, opts.flags);
              var stat = FS.stat(path);
              var length = stat.size;
              var buf = new Uint8Array(length);
              FS.read(stream, buf, 0, length, 0);
              if (opts.encoding === "utf8") {
                  ret = UTF8ArrayToString(buf, 0)
              } else if (opts.encoding === "binary") {
                  ret = buf
              }
              FS.close(stream);
              return ret
          }
          ,
          writeFile: (path,data,opts={})=>{
              opts.flags = opts.flags || 577;
              var stream = FS.open(path, opts.flags, opts.mode);
              if (typeof data == "string") {
                  var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
                  var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
                  FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
              } else if (ArrayBuffer.isView(data)) {
                  FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
              } else {
                  throw new Error("Unsupported data type")
              }
              FS.close(stream)
          }
          ,
          cwd: ()=>FS.currentPath,
          chdir: path=>{
              var lookup = FS.lookupPath(path, {
                  follow: true
              });
              if (lookup.node === null) {
                  throw new FS.ErrnoError(44)
              }
              if (!FS.isDir(lookup.node.mode)) {
                  throw new FS.ErrnoError(54)
              }
              var errCode = FS.nodePermissions(lookup.node, "x");
              if (errCode) {
                  throw new FS.ErrnoError(errCode)
              }
              FS.currentPath = lookup.path
          }
          ,
          createDefaultDirectories: ()=>{
              FS.mkdir("/tmp");
              FS.mkdir("/home");
              FS.mkdir("/home/web_user")
          }
          ,
          createDefaultDevices: ()=>{
              FS.mkdir("/dev");
              FS.registerDevice(FS.makedev(1, 3), {
                  read: ()=>0,
                  write: (stream,buffer,offset,length,pos)=>length
              });
              FS.mkdev("/dev/null", FS.makedev(1, 3));
              TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
              TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
              FS.mkdev("/dev/tty", FS.makedev(5, 0));
              FS.mkdev("/dev/tty1", FS.makedev(6, 0));
              var random_device = getRandomDevice();
              FS.createDevice("/dev", "random", random_device);
              FS.createDevice("/dev", "urandom", random_device);
              FS.mkdir("/dev/shm");
              FS.mkdir("/dev/shm/tmp")
          }
          ,
          createSpecialDirectories: ()=>{
              FS.mkdir("/proc");
              var proc_self = FS.mkdir("/proc/self");
              FS.mkdir("/proc/self/fd");
              FS.mount({
                  mount: ()=>{
                      var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
                      node.node_ops = {
                          lookup: (parent,name)=>{
                              var fd = +name;
                              var stream = FS.getStream(fd);
                              if (!stream)
                                  throw new FS.ErrnoError(8);
                              var ret = {
                                  parent: null,
                                  mount: {
                                      mountpoint: "fake"
                                  },
                                  node_ops: {
                                      readlink: ()=>stream.path
                                  }
                              };
                              ret.parent = ret;
                              return ret
                          }
                      };
                      return node
                  }
              }, {}, "/proc/self/fd")
          }
          ,
          createStandardStreams: ()=>{
              if (Module["stdin"]) {
                  FS.createDevice("/dev", "stdin", Module["stdin"])
              } else {
                  FS.symlink("/dev/tty", "/dev/stdin")
              }
              if (Module["stdout"]) {
                  FS.createDevice("/dev", "stdout", null, Module["stdout"])
              } else {
                  FS.symlink("/dev/tty", "/dev/stdout")
              }
              if (Module["stderr"]) {
                  FS.createDevice("/dev", "stderr", null, Module["stderr"])
              } else {
                  FS.symlink("/dev/tty1", "/dev/stderr")
              }
              var stdin = FS.open("/dev/stdin", 0);
              var stdout = FS.open("/dev/stdout", 1);
              var stderr = FS.open("/dev/stderr", 1)
          }
          ,
          ensureErrnoError: ()=>{
              if (FS.ErrnoError)
                  return;
              FS.ErrnoError = function ErrnoError(errno, node) {
                  this.node = node;
                  this.setErrno = function(errno) {
                      this.errno = errno
                  }
                  ;
                  this.setErrno(errno);
                  this.message = "FS error"
              }
              ;
              FS.ErrnoError.prototype = new Error;
              FS.ErrnoError.prototype.constructor = FS.ErrnoError;
              [44].forEach(code=>{
                  FS.genericErrors[code] = new FS.ErrnoError(code);
                  FS.genericErrors[code].stack = "<generic error, no stack>"
              }
              )
          }
          ,
          staticInit: ()=>{
              FS.ensureErrnoError();
              FS.nameTable = new Array(4096);
              FS.mount(MEMFS, {}, "/");
              FS.createDefaultDirectories();
              FS.createDefaultDevices();
              FS.createSpecialDirectories();
              FS.filesystems = {
                  "MEMFS": MEMFS
              }
          }
          ,
          init: (input,output,error)=>{
              FS.init.initialized = true;
              FS.ensureErrnoError();
              Module["stdin"] = input || Module["stdin"];
              Module["stdout"] = output || Module["stdout"];
              Module["stderr"] = error || Module["stderr"];
              FS.createStandardStreams()
          }
          ,
          quit: ()=>{
              FS.init.initialized = false;
              ___stdio_exit();
              for (var i = 0; i < FS.streams.length; i++) {
                  var stream = FS.streams[i];
                  if (!stream) {
                      continue
                  }
                  FS.close(stream)
              }
          }
          ,
          getMode: (canRead,canWrite)=>{
              var mode = 0;
              if (canRead)
                  mode |= 292 | 73;
              if (canWrite)
                  mode |= 146;
              return mode
          }
          ,
          findObject: (path,dontResolveLastLink)=>{
              var ret = FS.analyzePath(path, dontResolveLastLink);
              if (ret.exists) {
                  return ret.object
              } else {
                  return null
              }
          }
          ,
          analyzePath: (path,dontResolveLastLink)=>{
              try {
                  var lookup = FS.lookupPath(path, {
                      follow: !dontResolveLastLink
                  });
                  path = lookup.path
              } catch (e) {}
              var ret = {
                  isRoot: false,
                  exists: false,
                  error: 0,
                  name: null,
                  path: null,
                  object: null,
                  parentExists: false,
                  parentPath: null,
                  parentObject: null
              };
              try {
                  var lookup = FS.lookupPath(path, {
                      parent: true
                  });
                  ret.parentExists = true;
                  ret.parentPath = lookup.path;
                  ret.parentObject = lookup.node;
                  ret.name = PATH.basename(path);
                  lookup = FS.lookupPath(path, {
                      follow: !dontResolveLastLink
                  });
                  ret.exists = true;
                  ret.path = lookup.path;
                  ret.object = lookup.node;
                  ret.name = lookup.node.name;
                  ret.isRoot = lookup.path === "/"
              } catch (e) {
                  ret.error = e.errno
              }
              return ret
          }
          ,
          createPath: (parent,path,canRead,canWrite)=>{
              parent = typeof parent == "string" ? parent : FS.getPath(parent);
              var parts = path.split("/").reverse();
              while (parts.length) {
                  var part = parts.pop();
                  if (!part)
                      continue;
                  var current = PATH.join2(parent, part);
                  try {
                      FS.mkdir(current)
                  } catch (e) {}
                  parent = current
              }
              return current
          }
          ,
          createFile: (parent,name,properties,canRead,canWrite)=>{
              var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
              var mode = FS.getMode(canRead, canWrite);
              return FS.create(path, mode)
          }
          ,
          createDataFile: (parent,name,data,canRead,canWrite,canOwn)=>{
              var path = name;
              if (parent) {
                  parent = typeof parent == "string" ? parent : FS.getPath(parent);
                  path = name ? PATH.join2(parent, name) : parent
              }
              var mode = FS.getMode(canRead, canWrite);
              var node = FS.create(path, mode);
              if (data) {
                  if (typeof data == "string") {
                      var arr = new Array(data.length);
                      for (var i = 0, len = data.length; i < len; ++i)
                          arr[i] = data.charCodeAt(i);
                      data = arr
                  }
                  FS.chmod(node, mode | 146);
                  var stream = FS.open(node, 577);
                  FS.write(stream, data, 0, data.length, 0, canOwn);
                  FS.close(stream);
                  FS.chmod(node, mode)
              }
              return node
          }
          ,
          createDevice: (parent,name,input,output)=>{
              var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
              var mode = FS.getMode(!!input, !!output);
              if (!FS.createDevice.major)
                  FS.createDevice.major = 64;
              var dev = FS.makedev(FS.createDevice.major++, 0);
              FS.registerDevice(dev, {
                  open: stream=>{
                      stream.seekable = false
                  }
                  ,
                  close: stream=>{
                      if (output && output.buffer && output.buffer.length) {
                          output(10)
                      }
                  }
                  ,
                  read: (stream,buffer,offset,length,pos)=>{
                      var bytesRead = 0;
                      for (var i = 0; i < length; i++) {
                          var result;
                          try {
                              result = input()
                          } catch (e) {
                              throw new FS.ErrnoError(29)
                          }
                          if (result === undefined && bytesRead === 0) {
                              throw new FS.ErrnoError(6)
                          }
                          if (result === null || result === undefined)
                              break;
                          bytesRead++;
                          buffer[offset + i] = result
                      }
                      if (bytesRead) {
                          stream.node.timestamp = Date.now()
                      }
                      return bytesRead
                  }
                  ,
                  write: (stream,buffer,offset,length,pos)=>{
                      for (var i = 0; i < length; i++) {
                          try {
                              output(buffer[offset + i])
                          } catch (e) {
                              throw new FS.ErrnoError(29)
                          }
                      }
                      if (length) {
                          stream.node.timestamp = Date.now()
                      }
                      return i
                  }
              });
              return FS.mkdev(path, mode, dev)
          }
          ,
          forceLoadFile: obj=>{
              if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
                  return true;
              if (typeof XMLHttpRequest != "undefined") {
                  throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
              } else if (read_) {
                  try {
                      obj.contents = intArrayFromString(read_(obj.url), true);
                      obj.usedBytes = obj.contents.length
                  } catch (e) {
                      throw new FS.ErrnoError(29)
                  }
              } else {
                  throw new Error("Cannot load without read() or XMLHttpRequest.")
              }
          }
          ,
          createLazyFile: (parent,name,url,canRead,canWrite)=>{
              function LazyUint8Array() {
                  this.lengthKnown = false;
                  this.chunks = []
              }
              LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
                  if (idx > this.length - 1 || idx < 0) {
                      return undefined
                  }
                  var chunkOffset = idx % this.chunkSize;
                  var chunkNum = idx / this.chunkSize | 0;
                  return this.getter(chunkNum)[chunkOffset]
              }
              ;
              LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
                  this.getter = getter
              }
              ;
              LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
                  var xhr = new XMLHttpRequest;
                  xhr.open("HEAD", url, false);
                  xhr.send(null);
                  if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                      throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                  var datalength = Number(xhr.getResponseHeader("Content-length"));
                  var header;
                  var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
                  var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
                  var chunkSize = 1024 * 1024;
                  if (!hasByteServing)
                      chunkSize = datalength;
                  var doXHR = (from,to)=>{
                      if (from > to)
                          throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                      if (to > datalength - 1)
                          throw new Error("only " + datalength + " bytes available! programmer error!");
                      var xhr = new XMLHttpRequest;
                      xhr.open("GET", url, false);
                      if (datalength !== chunkSize)
                          xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                      xhr.responseType = "arraybuffer";
                      if (xhr.overrideMimeType) {
                          xhr.overrideMimeType("text/plain; charset=x-user-defined")
                      }
                      xhr.send(null);
                      if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                          throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                      if (xhr.response !== undefined) {
                          return new Uint8Array(xhr.response || [])
                      } else {
                          return intArrayFromString(xhr.responseText || "", true)
                      }
                  }
                  ;
                  var lazyArray = this;
                  lazyArray.setDataGetter(chunkNum=>{
                      var start = chunkNum * chunkSize;
                      var end = (chunkNum + 1) * chunkSize - 1;
                      end = Math.min(end, datalength - 1);
                      if (typeof lazyArray.chunks[chunkNum] == "undefined") {
                          lazyArray.chunks[chunkNum] = doXHR(start, end)
                      }
                      if (typeof lazyArray.chunks[chunkNum] == "undefined")
                          throw new Error("doXHR failed!");
                      return lazyArray.chunks[chunkNum]
                  }
                  );
                  if (usesGzip || !datalength) {
                      chunkSize = datalength = 1;
                      datalength = this.getter(0).length;
                      chunkSize = datalength;
                      out("LazyFiles on gzip forces download of the whole file when length is accessed")
                  }
                  this._length = datalength;
                  this._chunkSize = chunkSize;
                  this.lengthKnown = true
              }
              ;
              if (typeof XMLHttpRequest != "undefined") {
                  if (!ENVIRONMENT_IS_WORKER)
                      throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
                  var lazyArray = new LazyUint8Array;
                  Object.defineProperties(lazyArray, {
                      length: {
                          get: function() {
                              if (!this.lengthKnown) {
                                  this.cacheLength()
                              }
                              return this._length
                          }
                      },
                      chunkSize: {
                          get: function() {
                              if (!this.lengthKnown) {
                                  this.cacheLength()
                              }
                              return this._chunkSize
                          }
                      }
                  });
                  var properties = {
                      isDevice: false,
                      contents: lazyArray
                  }
              } else {
                  var properties = {
                      isDevice: false,
                      url: url
                  }
              }
              var node = FS.createFile(parent, name, properties, canRead, canWrite);
              if (properties.contents) {
                  node.contents = properties.contents
              } else if (properties.url) {
                  node.contents = null;
                  node.url = properties.url
              }
              Object.defineProperties(node, {
                  usedBytes: {
                      get: function() {
                          return this.contents.length
                      }
                  }
              });
              var stream_ops = {};
              var keys = Object.keys(node.stream_ops);
              keys.forEach(key=>{
                  var fn = node.stream_ops[key];
                  stream_ops[key] = function forceLoadLazyFile() {
                      FS.forceLoadFile(node);
                      return fn.apply(null, arguments)
                  }
              }
              );
              stream_ops.read = ((stream,buffer,offset,length,position)=>{
                  FS.forceLoadFile(node);
                  var contents = stream.node.contents;
                  if (position >= contents.length)
                      return 0;
                  var size = Math.min(contents.length - position, length);
                  if (contents.slice) {
                      for (var i = 0; i < size; i++) {
                          buffer[offset + i] = contents[position + i]
                      }
                  } else {
                      for (var i = 0; i < size; i++) {
                          buffer[offset + i] = contents.get(position + i)
                      }
                  }
                  return size
              }
              );
              node.stream_ops = stream_ops;
              return node
          }
          ,
          createPreloadedFile: (parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{
              var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
              var dep = getUniqueRunDependency("cp " + fullname);
              function processData(byteArray) {
                  function finish(byteArray) {
                      if (preFinish)
                          preFinish();
                      if (!dontCreateFile) {
                          FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                      }
                      if (onload)
                          onload();
                      removeRunDependency(dep)
                  }
                  if (Browser.handledByPreloadPlugin(byteArray, fullname, finish, ()=>{
                      if (onerror)
                          onerror();
                      removeRunDependency(dep)
                  }
                  )) {
                      return
                  }
                  finish(byteArray)
              }
              addRunDependency(dep);
              if (typeof url == "string") {
                  asyncLoad(url, byteArray=>processData(byteArray), onerror)
              } else {
                  processData(url)
              }
          }
          ,
          indexedDB: ()=>{
              return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
          }
          ,
          DB_NAME: ()=>{
              return "EM_FS_" + window.location.pathname
          }
          ,
          DB_VERSION: 20,
          DB_STORE_NAME: "FILE_DATA",
          saveFilesToDB: (paths,onload,onerror)=>{
              onload = onload || (()=>{}
              );
              onerror = onerror || (()=>{}
              );
              var indexedDB = FS.indexedDB();
              try {
                  var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
              } catch (e) {
                  return onerror(e)
              }
              openRequest.onupgradeneeded = (()=>{
                  out("creating db");
                  var db = openRequest.result;
                  db.createObjectStore(FS.DB_STORE_NAME)
              }
              );
              openRequest.onsuccess = (()=>{
                  var db = openRequest.result;
                  var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
                  var files = transaction.objectStore(FS.DB_STORE_NAME);
                  var ok = 0
                    , fail = 0
                    , total = paths.length;
                  function finish() {
                      if (fail == 0)
                          onload();
                      else
                          onerror()
                  }
                  paths.forEach(path=>{
                      var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                      putRequest.onsuccess = (()=>{
                          ok++;
                          if (ok + fail == total)
                              finish()
                      }
                      );
                      putRequest.onerror = (()=>{
                          fail++;
                          if (ok + fail == total)
                              finish()
                      }
                      )
                  }
                  );
                  transaction.onerror = onerror
              }
              );
              openRequest.onerror = onerror
          }
          ,
          loadFilesFromDB: (paths,onload,onerror)=>{
              onload = onload || (()=>{}
              );
              onerror = onerror || (()=>{}
              );
              var indexedDB = FS.indexedDB();
              try {
                  var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
              } catch (e) {
                  return onerror(e)
              }
              openRequest.onupgradeneeded = onerror;
              openRequest.onsuccess = (()=>{
                  var db = openRequest.result;
                  try {
                      var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
                  } catch (e) {
                      onerror(e);
                      return
                  }
                  var files = transaction.objectStore(FS.DB_STORE_NAME);
                  var ok = 0
                    , fail = 0
                    , total = paths.length;
                  function finish() {
                      if (fail == 0)
                          onload();
                      else
                          onerror()
                  }
                  paths.forEach(path=>{
                      var getRequest = files.get(path);
                      getRequest.onsuccess = (()=>{
                          if (FS.analyzePath(path).exists) {
                              FS.unlink(path)
                          }
                          FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                          ok++;
                          if (ok + fail == total)
                              finish()
                      }
                      );
                      getRequest.onerror = (()=>{
                          fail++;
                          if (ok + fail == total)
                              finish()
                      }
                      )
                  }
                  );
                  transaction.onerror = onerror
              }
              );
              openRequest.onerror = onerror
          }
      };
      var SYSCALLS = {
          DEFAULT_POLLMASK: 5,
          calculateAt: function(dirfd, path, allowEmpty) {
              if (path[0] === "/") {
                  return path
              }
              var dir;
              if (dirfd === -100) {
                  dir = FS.cwd()
              } else {
                  var dirstream = FS.getStream(dirfd);
                  if (!dirstream)
                      throw new FS.ErrnoError(8);
                  dir = dirstream.path
              }
              if (path.length == 0) {
                  if (!allowEmpty) {
                      throw new FS.ErrnoError(44)
                  }
                  return dir
              }
              return PATH.join2(dir, path)
          },
          doStat: function(func, path, buf) {
              try {
                  var stat = func(path)
              } catch (e) {
                  if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                      return -54
                  }
                  throw e
              }
              HEAP32[buf >> 2] = stat.dev;
              HEAP32[buf + 4 >> 2] = 0;
              HEAP32[buf + 8 >> 2] = stat.ino;
              HEAP32[buf + 12 >> 2] = stat.mode;
              HEAP32[buf + 16 >> 2] = stat.nlink;
              HEAP32[buf + 20 >> 2] = stat.uid;
              HEAP32[buf + 24 >> 2] = stat.gid;
              HEAP32[buf + 28 >> 2] = stat.rdev;
              HEAP32[buf + 32 >> 2] = 0;
              tempI64 = [stat.size >>> 0, (tempDouble = stat.size,
              +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
              HEAP32[buf + 40 >> 2] = tempI64[0],
              HEAP32[buf + 44 >> 2] = tempI64[1];
              HEAP32[buf + 48 >> 2] = 4096;
              HEAP32[buf + 52 >> 2] = stat.blocks;
              HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
              HEAP32[buf + 60 >> 2] = 0;
              HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
              HEAP32[buf + 68 >> 2] = 0;
              HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
              HEAP32[buf + 76 >> 2] = 0;
              tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino,
              +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
              HEAP32[buf + 80 >> 2] = tempI64[0],
              HEAP32[buf + 84 >> 2] = tempI64[1];
              return 0
          },
          doMsync: function(addr, stream, len, flags, offset) {
              var buffer = HEAPU8.slice(addr, addr + len);
              FS.msync(stream, buffer, offset, len, flags)
          },
          doMkdir: function(path, mode) {
              path = PATH.normalize(path);
              if (path[path.length - 1] === "/")
                  path = path.substr(0, path.length - 1);
              FS.mkdir(path, mode, 0);
              return 0
          },
          doMknod: function(path, mode, dev) {
              switch (mode & 61440) {
              case 32768:
              case 8192:
              case 24576:
              case 4096:
              case 49152:
                  break;
              default:
                  return -28
              }
              FS.mknod(path, mode, dev);
              return 0
          },
          doReadlink: function(path, buf, bufsize) {
              if (bufsize <= 0)
                  return -28;
              var ret = FS.readlink(path);
              var len = Math.min(bufsize, lengthBytesUTF8(ret));
              var endChar = HEAP8[buf + len];
              stringToUTF8(ret, buf, bufsize + 1);
              HEAP8[buf + len] = endChar;
              return len
          },
          doAccess: function(path, amode) {
              if (amode & ~7) {
                  return -28
              }
              var lookup = FS.lookupPath(path, {
                  follow: true
              });
              var node = lookup.node;
              if (!node) {
                  return -44
              }
              var perms = "";
              if (amode & 4)
                  perms += "r";
              if (amode & 2)
                  perms += "w";
              if (amode & 1)
                  perms += "x";
              if (perms && FS.nodePermissions(node, perms)) {
                  return -2
              }
              return 0
          },
          doReadv: function(stream, iov, iovcnt, offset) {
              var ret = 0;
              for (var i = 0; i < iovcnt; i++) {
                  var ptr = HEAP32[iov + i * 8 >> 2];
                  var len = HEAP32[iov + (i * 8 + 4) >> 2];
                  var curr = FS.read(stream, HEAP8, ptr, len, offset);
                  if (curr < 0)
                      return -1;
                  ret += curr;
                  if (curr < len)
                      break
              }
              return ret
          },
          doWritev: function(stream, iov, iovcnt, offset) {
              var ret = 0;
              for (var i = 0; i < iovcnt; i++) {
                  var ptr = HEAP32[iov + i * 8 >> 2];
                  var len = HEAP32[iov + (i * 8 + 4) >> 2];
                  var curr = FS.write(stream, HEAP8, ptr, len, offset);
                  if (curr < 0)
                      return -1;
                  ret += curr
              }
              return ret
          },
          varargs: undefined,
          get: function() {
              SYSCALLS.varargs += 4;
              var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
              return ret
          },
          getStr: function(ptr) {
              var ret = UTF8ToString(ptr);
              return ret
          },
          getStreamFromFD: function(fd) {
              var stream = FS.getStream(fd);
              if (!stream)
                  throw new FS.ErrnoError(8);
              return stream
          },
          get64: function(low, high) {
              return low
          }
      };
      function ___syscall_chdir(path) {
          try {
              path = SYSCALLS.getStr(path);
              FS.chdir(path);
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_faccessat(dirfd, path, amode, flags) {
          try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              return SYSCALLS.doAccess(path, amode)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_fstat64(fd, buf) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              return SYSCALLS.doStat(FS.stat, stream.path, buf)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_getcwd(buf, size) {
          try {
              if (size === 0)
                  return -28;
              var cwd = FS.cwd();
              var cwdLengthInBytes = lengthBytesUTF8(cwd);
              if (size < cwdLengthInBytes + 1)
                  return -68;
              stringToUTF8(cwd, buf, size);
              return buf
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_getdents64(fd, dirp, count) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              if (!stream.getdents) {
                  stream.getdents = FS.readdir(stream.path)
              }
              var struct_size = 280;
              var pos = 0;
              var off = FS.llseek(stream, 0, 1);
              var idx = Math.floor(off / struct_size);
              while (idx < stream.getdents.length && pos + struct_size <= count) {
                  var id;
                  var type;
                  var name = stream.getdents[idx];
                  if (name === ".") {
                      id = stream.node.id;
                      type = 4
                  } else if (name === "..") {
                      var lookup = FS.lookupPath(stream.path, {
                          parent: true
                      });
                      id = lookup.node.id;
                      type = 4
                  } else {
                      var child = FS.lookupNode(stream.node, name);
                      id = child.id;
                      type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8
                  }
                  tempI64 = [id >>> 0, (tempDouble = id,
                  +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
                  HEAP32[dirp + pos >> 2] = tempI64[0],
                  HEAP32[dirp + pos + 4 >> 2] = tempI64[1];
                  tempI64 = [(idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size,
                  +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
                  HEAP32[dirp + pos + 8 >> 2] = tempI64[0],
                  HEAP32[dirp + pos + 12 >> 2] = tempI64[1];
                  HEAP16[dirp + pos + 16 >> 1] = 280;
                  HEAP8[dirp + pos + 18 >> 0] = type;
                  stringToUTF8(name, dirp + pos + 19, 256);
                  pos += struct_size;
                  idx += 1
              }
              FS.llseek(stream, idx * struct_size, 0);
              return pos
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_lstat64(path, buf) {
          try {
              path = SYSCALLS.getStr(path);
              return SYSCALLS.doStat(FS.lstat, path, buf)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_newfstatat(dirfd, path, buf, flags) {
          try {
              path = SYSCALLS.getStr(path);
              var nofollow = flags & 256;
              var allowEmpty = flags & 4096;
              flags = flags & ~4352;
              path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
              return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_openat(dirfd, path, flags, varargs) {
          SYSCALLS.varargs = varargs;
          try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              var mode = varargs ? SYSCALLS.get() : 0;
              return FS.open(path, flags, mode).fd
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
          try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              return SYSCALLS.doReadlink(path, buf, bufsize)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_rmdir(path) {
          try {
              path = SYSCALLS.getStr(path);
              FS.rmdir(path);
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_stat64(path, buf) {
          try {
              path = SYSCALLS.getStr(path);
              return SYSCALLS.doStat(FS.stat, path, buf)
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_statfs64(path, size, buf) {
          try {
              path = SYSCALLS.getStr(path);
              HEAP32[buf + 4 >> 2] = 4096;
              HEAP32[buf + 40 >> 2] = 4096;
              HEAP32[buf + 8 >> 2] = 1e6;
              HEAP32[buf + 12 >> 2] = 5e5;
              HEAP32[buf + 16 >> 2] = 5e5;
              HEAP32[buf + 20 >> 2] = FS.nextInode;
              HEAP32[buf + 24 >> 2] = 1e6;
              HEAP32[buf + 28 >> 2] = 42;
              HEAP32[buf + 44 >> 2] = 2;
              HEAP32[buf + 36 >> 2] = 255;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function ___syscall_unlinkat(dirfd, path, flags) {
          try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              if (flags === 0) {
                  FS.unlink(path)
              } else if (flags === 512) {
                  FS.rmdir(path)
              } else {
                  abort("Invalid flags passed to unlinkat")
              }
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function __mmap_js(addr, len, prot, flags, fd, off, allocated, builtin) {
          try {
              var info = FS.getStream(fd);
              if (!info)
                  return -8;
              var res = FS.mmap(info, addr, len, off, prot, flags);
              var ptr = res.ptr;
              HEAP32[allocated >> 2] = res.allocated;
              return ptr
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function __munmap_js(addr, len, prot, flags, fd, offset) {
          try {
              var stream = FS.getStream(fd);
              if (stream) {
                  if (prot & 2) {
                      SYSCALLS.doMsync(addr, stream, len, flags, offset)
                  }
                  FS.munmap(stream)
              }
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return -e.errno
          }
      }
      function _abort() {
          abort("")
      }
      function _exit(status) {
          exit(status)
      }
      function maybeExit() {
          if (!keepRuntimeAlive()) {
              try {
                  _exit(EXITSTATUS)
              } catch (e) {
                  handleException(e)
              }
          }
      }
      function callUserCallback(func, synchronous) {
          if (runtimeExited || ABORT) {
              return
          }
          if (synchronous) {
              func();
              return
          }
          try {
              func();
              maybeExit()
          } catch (e) {
              handleException(e)
          }
      }
      function _alarm(seconds) {
          setTimeout(function() {
              callUserCallback(function() {
                  _raise(14)
              })
          }, seconds * 1e3)
      }
      function _emscripten_memcpy_big(dest, src, num) {
          HEAPU8.copyWithin(dest, src, src + num)
      }
      function _emscripten_get_heap_max() {
          return 2147483648
      }
      function emscripten_realloc_buffer(size) {
          try {
              wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
              updateGlobalBufferAndViews(wasmMemory.buffer);
              return 1
          } catch (e) {}
      }
      function _emscripten_resize_heap(requestedSize) {
          var oldSize = HEAPU8.length;
          requestedSize = requestedSize >>> 0;
          var maxHeapSize = _emscripten_get_heap_max();
          if (requestedSize > maxHeapSize) {
              return false
          }
          let alignUp = (x,multiple)=>x + (multiple - x % multiple) % multiple;
          for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
              var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
              overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
              var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
              var replacement = emscripten_realloc_buffer(newSize);
              if (replacement) {
                  return true
              }
          }
          return false
      }
      var ENV = {};
      function getExecutableName() {
          return thisProgram || "./this.program"
      }
      function getEnvStrings() {
          if (!getEnvStrings.strings) {
              var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
              var env = {
                  "USER": "web_user",
                  "LOGNAME": "web_user",
                  "PATH": "/",
                  "PWD": "/",
                  "HOME": "/home/web_user",
                  "LANG": lang,
                  "_": getExecutableName()
              };
              for (var x in ENV) {
                  if (ENV[x] === undefined)
                      delete env[x];
                  else
                      env[x] = ENV[x]
              }
              var strings = [];
              for (var x in env) {
                  strings.push(x + "=" + env[x])
              }
              getEnvStrings.strings = strings
          }
          return getEnvStrings.strings
      }
      function _environ_get(__environ, environ_buf) {
          var bufSize = 0;
          getEnvStrings().forEach(function(string, i) {
              var ptr = environ_buf + bufSize;
              HEAP32[__environ + i * 4 >> 2] = ptr;
              writeAsciiToMemory(string, ptr);
              bufSize += string.length + 1
          });
          return 0
      }
      function _environ_sizes_get(penviron_count, penviron_buf_size) {
          var strings = getEnvStrings();
          HEAP32[penviron_count >> 2] = strings.length;
          var bufSize = 0;
          strings.forEach(function(string) {
              bufSize += string.length + 1
          });
          HEAP32[penviron_buf_size >> 2] = bufSize;
          return 0
      }
      function _fd_close(fd) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              FS.close(stream);
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      function _fd_fdstat_get(fd, pbuf) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
              HEAP8[pbuf >> 0] = type;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      function _fd_pread(fd, iov, iovcnt, offset_low, offset_high, pnum) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var num = SYSCALLS.doReadv(stream, iov, iovcnt, offset_low);
              HEAP32[pnum >> 2] = num;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      function _fd_read(fd, iov, iovcnt, pnum) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var num = SYSCALLS.doReadv(stream, iov, iovcnt);
              HEAP32[pnum >> 2] = num;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var HIGH_OFFSET = 4294967296;
              var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
              var DOUBLE_LIMIT = 9007199254740992;
              if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
                  return -61
              }
              FS.llseek(stream, offset, whence);
              tempI64 = [stream.position >>> 0, (tempDouble = stream.position,
              +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
              HEAP32[newOffset >> 2] = tempI64[0],
              HEAP32[newOffset + 4 >> 2] = tempI64[1];
              if (stream.getdents && offset === 0 && whence === 0)
                  stream.getdents = null;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      function _fd_write(fd, iov, iovcnt, pnum) {
          try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var num = SYSCALLS.doWritev(stream, iov, iovcnt);
              HEAP32[pnum >> 2] = num;
              return 0
          } catch (e) {
              if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError))
                  throw e;
              return e.errno
          }
      }
      var FSNode = function(parent, name, mode, rdev) {
          if (!parent) {
              parent = this
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.mounted = null;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.node_ops = {};
          this.stream_ops = {};
          this.rdev = rdev
      };
      var readMode = 292 | 73;
      var writeMode = 146;
      Object.defineProperties(FSNode.prototype, {
          read: {
              get: function() {
                  return (this.mode & readMode) === readMode
              },
              set: function(val) {
                  val ? this.mode |= readMode : this.mode &= ~readMode
              }
          },
          write: {
              get: function() {
                  return (this.mode & writeMode) === writeMode
              },
              set: function(val) {
                  val ? this.mode |= writeMode : this.mode &= ~writeMode
              }
          },
          isFolder: {
              get: function() {
                  return FS.isDir(this.mode)
              }
          },
          isDevice: {
              get: function() {
                  return FS.isChrdev(this.mode)
              }
          }
      });
      FS.FSNode = FSNode;
      FS.staticInit();
      function intArrayFromString(stringy, dontAddNull, length) {
          var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
          var u8array = new Array(len);
          var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
          if (dontAddNull)
              u8array.length = numBytesWritten;
          return u8array
      }
      var asmLibraryArg = {
          "t": ___call_sighandler,
          "h": ___syscall_chdir,
          "i": ___syscall_faccessat,
          "C": ___syscall_fstat64,
          "y": ___syscall_getcwd,
          "r": ___syscall_getdents64,
          "z": ___syscall_lstat64,
          "A": ___syscall_newfstatat,
          "u": ___syscall_openat,
          "q": ___syscall_readlinkat,
          "p": ___syscall_rmdir,
          "B": ___syscall_stat64,
          "o": ___syscall_statfs64,
          "f": ___syscall_unlinkat,
          "v": __mmap_js,
          "w": __munmap_js,
          "a": _abort,
          "e": _alarm,
          "g": _emscripten_memcpy_big,
          "n": _emscripten_resize_heap,
          "j": _environ_get,
          "k": _environ_sizes_get,
          "b": _exit,
          "c": _fd_close,
          "x": _fd_fdstat_get,
          "l": _fd_pread,
          "s": _fd_read,
          "m": _fd_seek,
          "d": _fd_write
      };
      var asm = createWasm();
      var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
          return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["E"]).apply(null, arguments)
      }
      ;
      var _main = Module["_main"] = function() {
          return (_main = Module["_main"] = Module["asm"]["F"]).apply(null, arguments)
      }
      ;
      var _raise = Module["_raise"] = function() {
          return (_raise = Module["_raise"] = Module["asm"]["H"]).apply(null, arguments)
      }
      ;
      var ___stdio_exit = Module["___stdio_exit"] = function() {
          return (___stdio_exit = Module["___stdio_exit"] = Module["asm"]["I"]).apply(null, arguments)
      }
      ;
      var ___funcs_on_exit = Module["___funcs_on_exit"] = function() {
          return (___funcs_on_exit = Module["___funcs_on_exit"] = Module["asm"]["J"]).apply(null, arguments)
      }
      ;
      var _emscripten_builtin_memalign = Module["_emscripten_builtin_memalign"] = function() {
          return (_emscripten_builtin_memalign = Module["_emscripten_builtin_memalign"] = Module["asm"]["K"]).apply(null, arguments)
      }
      ;
      var stackAlloc = Module["stackAlloc"] = function() {
          return (stackAlloc = Module["stackAlloc"] = Module["asm"]["L"]).apply(null, arguments)
      }
      ;
      Module["callMain"] = callMain;
      Module["FS"] = FS;
      var calledRun;
      function ExitStatus(status) {
          this.name = "ExitStatus";
          this.message = "Program terminated with exit(" + status + ")";
          this.status = status
      }
      var calledMain = false;
      dependenciesFulfilled = function runCaller() {
          if (!calledRun)
              run();
          if (!calledRun)
              dependenciesFulfilled = runCaller
      }
      ;
      function callMain(args) {
          var entryFunction = Module["_main"];
          args = args || [];
          var argc = args.length + 1;
          var argv = stackAlloc((argc + 1) * 4);
          HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
          for (var i = 1; i < argc; i++) {
              HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
          }
          HEAP32[(argv >> 2) + argc] = 0;
          try {
              var ret = entryFunction(argc, argv);
              exit(ret, true);
              return ret
          } catch (e) {
              return handleException(e)
          } finally {
              calledMain = true
          }
      }
      function run(args) {
          args = args || arguments_;
          if (runDependencies > 0) {
              return
          }
          preRun();
          if (runDependencies > 0) {
              return
          }
          function doRun() {
              if (calledRun)
                  return;
              calledRun = true;
              Module["calledRun"] = true;
              if (ABORT)
                  return;
              initRuntime();
              preMain();
              readyPromiseResolve(Module);
              if (Module["onRuntimeInitialized"])
                  Module["onRuntimeInitialized"]();
              if (shouldRunNow)
                  callMain(args);
              postRun()
          }
          if (Module["setStatus"]) {
              Module["setStatus"]("Running...");
              setTimeout(function() {
                  setTimeout(function() {
                      Module["setStatus"]("")
                  }, 1);
                  doRun()
              }, 1)
          } else {
              doRun()
          }
      }
      Module["run"] = run;
      function exit(status, implicit) {
          EXITSTATUS = status;
          if (!keepRuntimeAlive()) {
              exitRuntime()
          }
          procExit(status)
      }
      function procExit(code) {
          EXITSTATUS = code;
          if (!keepRuntimeAlive()) {
              if (Module["onExit"])
                  Module["onExit"](code);
              ABORT = true
          }
          quit_(code, new ExitStatus(code))
      }
      if (Module["preInit"]) {
          if (typeof Module["preInit"] == "function")
              Module["preInit"] = [Module["preInit"]];
          while (Module["preInit"].length > 0) {
              Module["preInit"].pop()()
          }
      }
      var shouldRunNow = false;
      if (Module["noInitialRun"])
          shouldRunNow = false;
      run();

      return Module.ready
  }
  );
}
)();
export default Module;
