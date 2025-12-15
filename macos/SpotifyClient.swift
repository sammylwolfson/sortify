import Foundation
import Combine

final class SpotifyClient: ObservableObject {
    // weak reference to auth to allow automatic refresh on 401
    weak var auth: SpotifyAuth?

    @Published var playlists: [Playlist] = []
    @Published var genreGroups: [GenreGroup] = []
    @Published var isLoading = false
    @Published var lastError: Error?

    private let tokenKey = "sortify.spotify.token"
    private let baseURL = "https://api.spotify.com/v1"
    private let rateLimiter = RateLimiter()

    // A lightweight cache
    private let cache = CacheStore.shared
    // in-memory mapping of genre -> playlistId
    private(set) var playlistMapping: [String: String] = [:]

    init() {
        // load cache if present
        if let cached = try? cache.loadCachedTracks() {
            self.genreGroups = Self.groupTracksByGenre(tracks: cached.tracks, artists: cached.artists)
        }
        // load mapping if present
        if let map = try? cache.loadPlaylistMapping() {
            self.playlistMapping = map
        }
    }

    // Fetch saved tracks (paginated)
    func fetchLikedSongsAndGroup(auth: SpotifyAuth, completion: @escaping (Result<Void, Error>) -> Void) {
        isLoading = true
        lastError = nil

        Task {
            do {
                let accessToken = try await auth.getValidAccessToken()
                let tracks = try await fetchSavedTracks(accessToken: accessToken)
                // gather artist ids
                let artistIds = Set(tracks.flatMap { $0.artistIds })
                let artists = try await fetchArtistsBatch(ids: Array(artistIds), accessToken: accessToken)
                let groups = Self.groupTracksByGenre(tracks: tracks, artists: artists)
                let mapped = groups.map { g -> GenreGroup in
                    var copy = g
                    copy.mappedPlaylistId = self.playlistMapping[g.name]
                    return copy
                }
                DispatchQueue.main.async {
                    self.genreGroups = mapped
                    try? self.cache.save(tracks: tracks, artists: artists)
                    self.isLoading = false
                    completion(.success(()))
                }
            } catch {
                DispatchQueue.main.async {
                    self.lastError = error
                    self.isLoading = false
                    completion(.failure(error))
                }
            }
        }
    }

    // MARK: - API Calls
    private func fetchSavedTracks(accessToken: String) async throws -> [Track] {
        var tracks: [Track] = []
        var offset = 0
        let limit = 50
        while true {
            let url = URL(string: "\(baseURL)/me/tracks?limit=\(limit)&offset=\(offset)")!
            let (data, resp) = try await sendRequest(url: url, accessToken: accessToken)
            guard let http = resp as? HTTPURLResponse else { throw ClientError.invalidResponse }
            if http.statusCode == 200 {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let items = json?["items"] as? [[String: Any]] else { break }
                for item in items {
                    if let trackObj = item["track"] as? [String: Any],
                       let id = trackObj["id"] as? String,
                       let name = trackObj["name"] as? String,
                       let uri = trackObj["uri"] as? String {
                        let albumName = (trackObj["album"] as? [String: Any])?["name"] as? String
                        let artists = (trackObj["artists"] as? [[String: Any]]) ?? []
                        let artistIds = artists.compactMap { $0["id"] as? String }
                        let artistNames = artists.compactMap { $0["name"] as? String }
                        let t = Track(id: id, name: name, artistIds: artistIds, artistNames: artistNames, albumName: albumName, uri: uri)
                        tracks.append(t)
                    }
                }
                if (items.count) < limit { break }
                offset += limit
            } else if http.statusCode == 401 {
                throw ClientError.unauthorized
            } else {
                throw ClientError.httpError(code: http.statusCode)
            }
        }
        return tracks
    }

    private func fetchArtistsBatch(ids: [String], accessToken: String) async throws -> [Artist] {
        var result: [Artist] = []
        let chunkSize = 50
        let idChunks = stride(from: 0, to: ids.count, by: chunkSize).map { Array(ids[$0..<min(ids.count, $0+chunkSize)]) }
        for chunk in idChunks {
            let url = URL(string: "\(baseURL)/artists?ids=\(chunk.joined(separator: ","))")!
            let (data, resp) = try await sendRequest(url: url, accessToken: accessToken)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw ClientError.invalidResponse }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let artists = json?["artists"] as? [[String: Any]] {
                for a in artists {
                    if let id = a["id"] as? String {
                        let name = a["name"] as? String ?? ""
                        let genres = a["genres"] as? [String] ?? []
                        result.append(Artist(id: id, name: name, genres: genres))
                    }
                }
            }
        }
        return result
    }

    func fetchPlaylists(accessToken: String) async throws -> [Playlist] {
        var playlists: [Playlist] = []
        var offset = 0
        let limit = 50
        while true {
            let url = URL(string: "\(baseURL)/me/playlists?limit=\(limit)&offset=\(offset)")!
            let (data, resp) = try await sendRequest(url: url, accessToken: accessToken)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw ClientError.invalidResponse }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let items = json?["items"] as? [[String: Any]] ?? []
            for it in items {
                if let id = it["id"] as? String, let name = it["name"] as? String {
                    playlists.append(Playlist(id: id, name: name))
                }
            }
            if items.count < limit { break }
            offset += limit
        }
        return playlists
    }

    func fetchPlaylists(auth: SpotifyAuth, completion: @escaping (Result<Void, Error>) -> Void) {
        Task {
            do {
                let accessToken = try await auth.getValidAccessToken()
                let pls = try await fetchPlaylists(accessToken: accessToken)
                DispatchQueue.main.async {
                    self.playlists = pls
                    completion(.success(()))
                }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }
    }

    func loadPlaylistMapping() {
        if let map = try? cache.loadPlaylistMapping() {
            self.playlistMapping = map
        }
    }

    func savePlaylistMapping() {
        try? cache.savePlaylistMapping(map: playlistMapping)
    }

    func setMapping(genre: String, playlistId: String?) {
        if let pid = playlistId {
            playlistMapping[genre] = pid
        } else {
            playlistMapping.removeValue(forKey: genre)
        }
        savePlaylistMapping()
    }

    /// Add tracks to playlist in chunks. Optionally report progress via closure (completedChunks, totalChunks).
    func addTracksToPlaylist(auth: SpotifyAuth, playlistId: String, uris: [String], progress: ((Int, Int) -> Void)? = nil) async throws {
        // Spotify allows up to 100 URIs per request
        let chunkSize = 100
        let chunks = stride(from: 0, to: uris.count, by: chunkSize).map { Array(uris[$0..<min(uris.count, $0+chunkSize)]) }
        let total = chunks.count
        var accessToken = try await auth.getValidAccessToken()

        for (i, chunk) in chunks.enumerated() {
            let url = URL(string: "\(baseURL)/playlists/\(playlistId)/tracks")!
            let body = try JSONSerialization.data(withJSONObject: ["uris": chunk])

            let (data, resp) = try await sendRequest(url: url, method: "POST", body: body, accessToken: accessToken)
            guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw ClientError.httpError(code: (resp as? HTTPURLResponse)?.statusCode ?? -1)
            }
            _ = data
            progress?(i + 1, total)
        }
    }

    // Helper to get current access token from Keychain (used by internal calls)
    private func currentAccessToken() throws -> String {
        // Deprecated: prefer using SpotifyAuth.getValidAccessToken(). Kept for compatibility.
        if let data = try? KeychainStore.load(key: tokenKey), let d = data {
            let decoder = JSONDecoder()
            let t = try decoder.decode(Token.self, from: d)
            if t.expiresAt > Date().timeIntervalSince1970 { return t.accessToken }
            throw ClientError.unauthorized
        }
        throw ClientError.notAuthenticated
    }

    /// Send a request with retries. Handles 401 by asking auth to refresh, 429 by honoring Retry-After, and 5xx with exponential backoff.
    private func sendRequest(url: URL, method: String = "GET", body: Data? = nil, accessToken: String, allowRefresh: Bool = true) async throws -> (Data, URLResponse) {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.httpBody = body
        if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let maxRetries = 4
        var attempt = 0
        var didRefresh = false

        while true {
            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse {
                    switch http.statusCode {
                    case 200...299:
                        return (data, resp)
                    case 401:
                        // try refresh once
                        if allowRefresh, !didRefresh, let auth = self.auth {
                            didRefresh = true
                            let newToken = try await auth.getValidAccessToken()
                            req.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                            // retry immediately
                            attempt += 1
                            if attempt > maxRetries { throw ClientError.unauthorized }
                            continue
                        }
                        throw ClientError.unauthorized
                    case 429:
                        // Rate limited: respect Retry-After header if present
                        var wait: TimeInterval = pow(2.0, Double(min(attempt, 6)))
                        if let ra = http.value(forHTTPHeaderField: "Retry-After"), let raSec = Double(ra) {
                            wait = raSec
                        }
                        // notify UI with wait time
                        NotificationCenter.default.post(name: .spotifyRateLimited, object: wait)
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        try await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
                        continue
                    case 500...599:
                        // server error -> backoff and retry
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        let backoff = pow(2.0, Double(attempt))
                        try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                        continue
                    default:
                        throw ClientError.httpError(code: http.statusCode)
                    }
                } else {
                    return (data, resp)
                }
            } catch {
                // Network/transport error: retry with backoff up to maxRetries
                attempt += 1
                if attempt > maxRetries { throw error }
                let backoff = pow(2.0, Double(attempt))
                try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                continue
            }
        }
    }

    // Simple grouping heuristics
    static func groupTracksByGenre(tracks: [Track], artists: [Artist]) -> [GenreGroup] {
        var artistById = [String: Artist]()
        for a in artists { artistById[a.id] = a }

        var genreMap: [String: [Track]] = [:]
        for t in tracks {
            var assigned = false
            for aid in t.artistIds {
                if let ar = artistById[aid], !ar.genres.isEmpty {
                    for g in ar.genres {
                        genreMap[g, default: []].append(t)
                        assigned = true
                    }
                }
            }
            if !assigned {
                genreMap["(Unknown)", default: []].append(t)
            }
        }
        return genreMap.map { key, value in
            let tracks = Array(Set(value))
            let mapped = ("").isEmpty ? nil : nil // placeholder
            return GenreGroup(name: key, tracks: tracks, mappedPlaylistId: nil)
        }.sorted { $0.name < $1.name }
    }
}

enum ClientError: Error {
    case notAuthenticated
    case unauthorized
    case invalidResponse
    case httpError(code: Int)
}
