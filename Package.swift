// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "Sortify",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .library(
            name: "SortifyCore",
            targets: ["SortifyCore"]
        ),
    ],
    targets: [
        .target(
            name: "SortifyCore",
            path: "Sortify",
            sources: [
                "Models.swift",
                "SuggestionEngine.swift",
                "PlaylistAnalyzer.swift",
                "TrackGrouping.swift",
                "Errors.swift",
                "Notifications.swift",
                "SpotifyAPIModels.swift",
            ]
        ),
        .testTarget(
            name: "SortifyCoreTests",
            dependencies: ["SortifyCore"],
            path: "Tests/SortifyCoreTests"
        ),
    ]
)
