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
    var releaseDate: String?
    var uri: String

    /// Backward-compatible initializer (releaseDate defaults to nil).
    init(id: String, name: String, artistIds: [String], artistNames: [String], albumName: String?, uri: String) {
        self.id = id
        self.name = name
        self.artistIds = artistIds
        self.artistNames = artistNames
        self.albumName = albumName
        self.releaseDate = nil
        self.uri = uri
    }

    init(id: String, name: String, artistIds: [String], artistNames: [String], albumName: String?, releaseDate: String?, uri: String) {
        self.id = id
        self.name = name
        self.artistIds = artistIds
        self.artistNames = artistNames
        self.albumName = albumName
        self.releaseDate = releaseDate
        self.uri = uri
    }

    /// Returns the decade string like "1980s", "2010s", or nil if unknown.
    var decade: String? {
        guard let dateStr = releaseDate,
              let year = Int(dateStr.prefix(4)),
              year >= 1900, year <= 2099
        else { return nil }
        let decadeStart = (year / 10) * 10
        return "\(decadeStart)s"
    }
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

enum GroupingMode: String, CaseIterable, Identifiable {
    case genreOnly = "Genre Only"
    case genreAndDecade = "Genre + Decade"
    var id: String { rawValue }
}
