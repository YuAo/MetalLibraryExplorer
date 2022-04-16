//
//  File.swift
//  
//
//  Created by YuAo on 2022/4/15.
//

import Foundation
import MetalLibraryArchive

struct FileIO {
    enum Error: LocalizedError {
        case cannotOpenFileForReading(String)
        case cannotOpenFileForWriting(String)
        case cannotGetFileInformation(String)
        case cannotReadFile(String)
        case cannotWriteFile(String)
    }
    
    static func readData(from url: URL) throws -> Data {
        let file = open(url.path.cString(using: .utf8)!, O_RDONLY)
        guard file >= 0 else {
            let message = String(cString: strerror(errno))
            throw Error.cannotOpenFileForReading(message)
        }
        defer {
            close(file)
        }
        var fileInformation: stat = stat()
        guard fstat(file, &fileInformation) >= 0 else {
            let message = String(cString: strerror(errno))
            throw Error.cannotGetFileInformation(message)
        }
        let fileSize = fileInformation.st_size
        print("File size: \(fileSize)");
        var buffer = Data(count: Int(16 * 1024 * 1024))
        let readResult = buffer.withUnsafeMutableBytes({ (ptr: UnsafeMutableRawBufferPointer) -> Int in
            read(file, ptr.baseAddress, ptr.count)
        })
        guard readResult >= 0 else {
            let message = String(cString: strerror(errno))
            throw Error.cannotReadFile(message)
        }
        print("Read size: \(readResult)");
        return buffer[0..<readResult];
    }
    
    static func writeData(_ data: Data, to url: URL) throws {
        let file = creat(url.path.cString(using: .utf8)!, 0)
        guard file >= 0 else {
            let message = String(cString: strerror(errno))
            throw Error.cannotOpenFileForWriting(message)
        }
        defer {
            close(file)
        }
        let writeResult = data.withUnsafeBytes({ (ptr: UnsafeRawBufferPointer) -> Int in
            write(file, ptr.baseAddress!, ptr.count)
        })
        guard writeResult >= 0 else {
            let message = String(cString: strerror(errno))
            throw Error.cannotReadFile(message)
        }
    }
}

struct ArchiveJSON: Codable {
    let type: String
    let targetPlatform: String
    let functions: [Function]
    let bitcodeTable: [String: Data]
    
    init(archive: MetalLibraryArchive.Archive) {
        func hashString(_ hash: Data) -> String {
            return hash.map {
                String(format: "%02hhx", $0)
            }.joined()
        }
        var functions: [Function] = []
        var bitcodeTable: [String: Data] = [:]
        for function in archive.functions {
            let id = hashString(function.bitcodeHash)
            if let data = bitcodeTable[id] {
                precondition(data == function.bitcode)
            } else {
                bitcodeTable[id] = function.bitcode
            }
            functions.append(Function(function: function, bitcodeID: id))
        }
        self.functions = functions
        self.bitcodeTable = bitcodeTable
        self.targetPlatform = archive.targetPlatform.description
        self.type = archive.libraryType.description
    }
    
    struct Function: Codable {
        struct LanguageVersion: Codable {
            var major: Int
            var minor: Int
        }
        let name: String
        let type: String?
        let languageVersion: LanguageVersion
        let bitcodeID: String
        
        init(function: MetalLibraryArchive.Function, bitcodeID: String) {
            self.name = function.name
            self.type = function.type?.description
            self.languageVersion = LanguageVersion(major: function.languageVersion.major, minor: function.languageVersion.minor)
            self.bitcodeID = bitcodeID
        }
    }
}

@_cdecl("parseMetalLib")
func parseMetalLib() -> Int32 {
    do {
        let buffer = try FileIO.readData(from: URL(fileURLWithPath: "/default.metallib"))
        let archive = try Archive(data: buffer)
        let jsonEncoder = JSONEncoder()
        let data = try jsonEncoder.encode(ArchiveJSON(archive: archive))
        try FileIO.writeData(data, to: URL(fileURLWithPath: "/output.json"))
        return 0;
    } catch {
        print(error)
        return -1;
    }
}

exit(parseMetalLib());
