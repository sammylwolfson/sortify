import Foundation

// Codable models for Spotify API responses used by SpotifyClient

struct SavedTracksResponse: Decodable {
    let items: [SavedTrackItem]
}

struct SavedTrackItem: Decodable {
    let track: TrackResponse?
}

struct TrackResponse: Decodable {
    let id: String
    let name: String
    let uri: String
    let album: AlbumResponse?
    let artists: [ArtistSummary]
}

struct AlbumResponse: Decodable {
    let name: String?
}

struct ArtistSummary: Decodable {
    let id: String?
    let name: String?
}

struct ArtistsResponse: Decodable {
    let artists: [ArtistResponse]
}

struct ArtistResponse: Decodable {
    let id: String
    let name: String
    let genres: [String]
}

struct PlaylistsResponse: Decodable {
    let items: [PlaylistItem]
}

struct PlaylistItem: Decodable {
    let id: String
    let name: String
}

struct PlaylistTracksResponse: Decodable {
    let items: [PlaylistTrackItem]
}

struct PlaylistTrackItem: Decodable {
    let track: TrackResponse?
}

struct AudioFeaturesResponse: Decodable {
    let audio_features: [AudioFeatureResponse?]
}

struct AudioFeatureResponse: Decodable {
    let id: String
    let tempo: Double
    let energy: Double
    let danceability: Double
    let valence: Double
}

// Token response from Spotify (authorization code and refresh responses)
struct TokenResponse: Decodable {
    let access_token: String
    let refresh_token: String?
    let expires_in: TimeInterval
    let scope: String?
    let token_type: String?
}
