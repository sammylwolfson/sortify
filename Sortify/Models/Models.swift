import Foundation

// Minimal models used by the skeleton
struct Token: Codable {
    var accessToken: String
    var refreshToken: String?
    var expiresAt: TimeInterval
    var scope: String?
    var tokenType: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
        case scope
        case tokenType = "token_type"
    }
}

struct Track: Identifiable, Codable {
    var id: String
    var name: String
    var artistIds: [String]
    var artistNames: [String]
    var albumName: String?
    var uri: String
    var genres: [String] = []
}

extension Track {
    var primaryArtist: String {
        artistNames.first ?? ""
    }

    var albumSortName: String {
        albumName ?? ""
    }

    var primaryGenre: String {
        genres.first ?? ""
    }
}

struct AudioFeatures: Identifiable, Codable {
    var id: String
    var tempo: Double
    var energy: Double
    var danceability: Double
    var valence: Double
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

enum SortBy: String, CaseIterable, Identifiable, Codable {
    case genre = "Genre"
    case bpm = "BPM"
    case energy = "Energy"
    case danceability = "Danceability"
    case valence = "Valence"

    var id: String { rawValue }
}

enum TrackSortBy: String, CaseIterable, Identifiable, Codable {
    case title = "Title"
    case artist = "Artist"
    case album = "Album"
    case genre = "Genre"
    case bpm = "BPM"
    case energy = "Energy"
    case danceability = "Danceability"
    case valence = "Valence"

    var id: String { rawValue }
}
