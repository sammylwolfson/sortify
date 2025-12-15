import Foundation

// Minimal models used by the skeleton
struct Token: Codable {
    var accessToken: String
    var refreshToken: String?
    var expiresAt: TimeInterval
    var scope: String?
    var tokenType: String?
}

struct Track: Identifiable, Codable {
    var id: String
    var name: String
    var artistIds: [String]
    var artistNames: [String]
    var albumName: String?
    var uri: String
}

struct Artist: Codable {
    var id: String
    var name: String
    var genres: [String]
}

struct Playlist: Identifiable, Codable {
    var id: String
    var name: String
}

struct GenreGroup: Identifiable {
    var id: String { name }
    var name: String
    var tracks: [Track]
    var mappedPlaylistId: String?
}
