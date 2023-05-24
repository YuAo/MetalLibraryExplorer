// swift-tools-version:5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "MetalLibraryArchiveParser",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v13),
        .watchOS(.v6),
        .tvOS(.v13),
        .macCatalyst(.v13)
    ],
    products: [
        .executable(
            name: "MetalLibraryArchiveParser",
            targets: ["MetalLibraryArchiveParser"]),
    ],
    dependencies: [.package(url: "https://github.com/YuAo/MetalLibraryArchive.git", from: "0.0.7")],
    targets: [
        .executableTarget(name: "MetalLibraryArchiveParser", dependencies: ["MetalLibraryArchive"]),
    ]
)