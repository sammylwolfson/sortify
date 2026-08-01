import Foundation
import Combine

final class SpotifyClient: ObservableObject {
    enum TrackSource: Equatable {
        case likedSongs
        case playlist(id: String)
    }

    // ref to auth so we can request tokens when sending requests
    weak var auth: SpotifyAuth?

    @Published var playlists: [Playlist] = []
    @Published var genreGroups: [GenreGroup] = []
    @Published var isLoading = false
    @Published var lastError: Error?
    @Published var availableGenres: [String] = []
    @Published var playlistGenreFilters: [String: [String]] = [:]

    private let baseURL = "https://api.spotify.com/v1"
    private let tokenKey = "sortify.spotify.token"
    // single NetworkClient instance per SpotifyClient (created when auth is set)
    private var networkClient: NetworkClient? = nil

    func configureNetwork(with auth: SpotifyAuth) {
        self.networkClient = NetworkClient(auth: auth)
    }

    // A lightweight cache
    private let cache = CacheStore.shared
    private var audioFeaturesCache: [String: AudioFeatures] = [:]
    // in-memory mapping of genre -> playlistId
    private(set) var playlistMapping: [String: String] = [:]

    init() {
        if let cached = try? cache.loadCachedTracks() {
            self.genreGroups = Self.groupTracksByGenre(tracks: cached.tracks, artists: cached.artists)
            if let af = cached.audioFeatures {
                self.audioFeaturesCache = af
            }
            self.availableGenres = Self.extractGenres(from: cached.artists)
        }
        if let map = try? cache.loadPlaylistMapping() {
            self.playlistMapping = map
        }
        if let filters = try? cache.loadPlaylistGenreFilters() {
            self.playlistGenreFilters = filters
        }
    }

    // Fetch saved tracks (paginated)
    func fetchLikedSongsAndGroup(auth: SpotifyAuth, completion: @escaping (Result<Void, Error>) -> Void) {
        isLoading = true
        lastError = nil

        Task {
            do {
                guard let network = self.networkClient else { throw ClientError.notAuthenticated }
                self.isLoading = true

                // fetch saved tracks via Codable responses
                let allTracks = try await fetchSavedTracksPaged(network: network)

                // gather artist ids and fetch artists in batches
                let artistIds = Array(Set(allTracks.flatMap { $0.artistIds }))
                var allArtists: [Artist] = []
                let artistChunkSize = 50
                let idChunks = stride(from: 0, to: artistIds.count, by: artistChunkSize).map { Array(artistIds[$0..<min(artistIds.count, $0+artistChunkSize)]) }
                for chunk in idChunks {
                    let idsParam = chunk.joined(separator: ",")
                    let artistsURL = URL(string: "\(baseURL)/artists?ids=\(idsParam)")!
                    let resp: ArtistsResponse = try await network.send(artistsURL)
                    for a in resp.artists {
                        allArtists.append(Artist(id: a.id, name: a.name, genres: a.genres))
                    }
                }

                let enrichedTracks = Self.applyGenres(to: allTracks, artists: allArtists)
                let groups = Self.groupTracksByGenre(tracks: allTracks, artists: allArtists)
                let mapped = groups.map { g -> GenreGroup in
                    var copy = g
                    copy.mappedPlaylistId = self.playlistMapping[g.name]
                    return copy
                }
                DispatchQueue.main.async {
                    self.genreGroups = mapped
                    self.availableGenres = Self.extractGenres(from: allArtists)
                    try? self.cache.save(tracks: enrichedTracks, artists: allArtists, audioFeatures: self.audioFeaturesCache)
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
    // fetches saved tracks by using NetworkClient and Codable models
    private func fetchSavedTracksPaged(network: NetworkClient) async throws -> [Track] {
        var tracks: [Track] = []
        var offset = 0
        let limit = 50
        while true {
            try Task.checkCancellation()
            let pageURL = URL(string: "\(baseURL)/me/tracks?limit=\(limit)&offset=\(offset)")!
            let page: SavedTracksResponse = try await network.send(pageURL)
            for item in page.items {
                if let tr = item.track {
                    let t = Track(id: tr.id, name: tr.name, artistIds: tr.artists.compactMap { $0.id }, artistNames: tr.artists.compactMap { $0.name }, albumName: tr.album?.name, uri: tr.uri, genres: [])
                    tracks.append(t)
                }
            }
            if page.items.count < limit { break }
            offset += limit
        }
        return tracks
    }

    private func fetchPlaylistTracksPaged(playlistId: String, network: NetworkClient) async throws -> [Track] {
        var tracks: [Track] = []
        var offset = 0
        let limit = 100
        while true {
            try Task.checkCancellation()
            let pageURL = URL(string: "\(baseURL)/playlists/\(playlistId)/tracks?limit=\(limit)&offset=\(offset)")!
            let page: PlaylistTracksResponse = try await network.send(pageURL)
            for item in page.items {
                if let tr = item.track {
                    let t = Track(id: tr.id, name: tr.name, artistIds: tr.artists.compactMap { $0.id }, artistNames: tr.artists.compactMap { $0.name }, albumName: tr.album?.name, uri: tr.uri, genres: [])
                    tracks.append(t)
                }
            }
            if page.items.count < limit { break }
            offset += limit
        }
        return tracks
    }

    private func fetchArtistsBatch(ids: [String], network: NetworkClient) async throws -> [Artist] {
        var result: [Artist] = []
        let chunkSize = 50
        let idChunks = stride(from: 0, to: ids.count, by: chunkSize).map { Array(ids[$0..<min(ids.count, $0+chunkSize)]) }
        for chunk in idChunks {
            try Task.checkCancellation()
            let url = URL(string: "\(baseURL)/artists?ids=\(chunk.joined(separator: ","))")!
            let resp: ArtistsResponse = try await network.send(url)
            for a in resp.artists {
                result.append(Artist(id: a.id, name: a.name, genres: a.genres))
            }
        }
        return result
    }

    func fetchPlaylistsAsync() async throws -> [Playlist] {
    guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        var playlists: [Playlist] = []
        var offset = 0
        let limit = 50
        while true {
            let url = URL(string: "\(baseURL)/me/playlists?limit=\(limit)&offset=\(offset)")!
            let page: PlaylistsResponse = try await network.send(url)
            for it in page.items {
                playlists.append(Playlist(id: it.id, name: it.name))
            }
            if page.items.count < limit { break }
            offset += limit
        }
        return playlists
    }

    func fetchPlaylists(auth: SpotifyAuth, completion: @escaping (Result<Void, Error>) -> Void) {
        Task {
            do {
                let pls = try await fetchPlaylistsAsync()
                DispatchQueue.main.async {
                    self.playlists = pls
                    completion(.success(()))
                }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }
    }

    /// Async version to fetch liked songs, group by genre, and return mapped groups.
    func fetchLikedSongsAndGroupAsync() async throws -> [GenreGroup] {
    guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        self.isLoading = true
        defer { self.isLoading = false }

        let tracks = try await fetchSavedTracksPaged(network: network)
        let artistIds = Array(Set(tracks.flatMap { $0.artistIds }))
        let artists = try await fetchArtistsBatch(ids: artistIds, network: network)
        let enrichedTracks = Self.applyGenres(to: tracks, artists: artists)
        let groups = Self.groupTracksByGenre(tracks: tracks, artists: artists)
        let mapped = groups.map { g -> GenreGroup in
            var copy = g
            copy.mappedPlaylistId = self.playlistMapping[g.name]
            return copy
        }
        self.availableGenres = Self.extractGenres(from: artists)
        try? self.cache.save(tracks: enrichedTracks, artists: artists, audioFeatures: self.audioFeaturesCache)
        return mapped
    }

    func fetchTracksAndGroupAsync(source: TrackSource, sortBy: SortBy) async throws -> ([GenreGroup], [Track]) {
        guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        self.isLoading = true
        defer { self.isLoading = false }

        let tracks: [Track]
        switch source {
        case .likedSongs:
            tracks = try await fetchSavedTracksPaged(network: network)
        case .playlist(let id):
            tracks = try await fetchPlaylistTracksPaged(playlistId: id, network: network)
        }

        let artistIds = Array(Set(tracks.flatMap { $0.artistIds }))
        let artists = try await fetchArtistsBatch(ids: artistIds, network: network)
        let enrichedTracks = Self.applyGenres(to: tracks, artists: artists)
        let groups: [GenreGroup]
        switch sortBy {
        case .genre:
            groups = Self.groupTracksByGenre(tracks: tracks, artists: artists)
        case .bpm, .energy, .danceability, .valence:
            let features = try await fetchAudioFeatures(ids: tracks.map { $0.id }, network: network)
            groups = Self.groupTracksByFeature(tracks: tracks, features: features, sortBy: sortBy)
        }
        let mapped = groups.map { g -> GenreGroup in
            var copy = g
            copy.mappedPlaylistId = self.playlistMapping[g.name]
            return copy
        }
        self.availableGenres = Self.extractGenres(from: artists)
        if case .likedSongs = source {
            try? self.cache.save(tracks: enrichedTracks, artists: artists, audioFeatures: self.audioFeaturesCache)
        }
        return (mapped, enrichedTracks)
    }

    func fetchTracksAsync(source: TrackSource) async throws -> [Track] {
        guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        self.isLoading = true
        defer { self.isLoading = false }

        let tracks: [Track]
        switch source {
        case .likedSongs:
            tracks = try await fetchSavedTracksPaged(network: network)
        case .playlist(let id):
            tracks = try await fetchPlaylistTracksPaged(playlistId: id, network: network)
        }
        let artistIds = Array(Set(tracks.flatMap { $0.artistIds }))
        let artists = try await fetchArtistsBatch(ids: artistIds, network: network)
        self.availableGenres = Self.extractGenres(from: artists)
        return Self.applyGenres(to: tracks, artists: artists)
    }

    private func fetchAudioFeatures(ids: [String], network: NetworkClient) async throws -> [String: AudioFeatures] {
        let uniqueIds = Array(Set(ids))
        var result: [String: AudioFeatures] = [:]

        // Use cached features when available
        for id in uniqueIds {
            if let cached = audioFeaturesCache[id] {
                result[id] = cached
            }
        }

        let missing = uniqueIds.filter { result[$0] == nil }
        if missing.isEmpty {
            return result
        }

        let chunkSize = 100
        let chunks = stride(from: 0, to: missing.count, by: chunkSize).map { Array(missing[$0..<min(missing.count, $0+chunkSize)]) }
        for chunk in chunks {
            try Task.checkCancellation()
            let url = URL(string: "\(baseURL)/audio-features?ids=\(chunk.joined(separator: ","))")!
            let resp: AudioFeaturesResponse = try await network.send(url)
            for item in resp.audio_features {
                if let af = item {
                    let mapped = AudioFeatures(id: af.id, tempo: af.tempo, energy: af.energy, danceability: af.danceability, valence: af.valence)
                    result[af.id] = mapped
                    audioFeaturesCache[af.id] = mapped
                }
            }
        }
        return result
    }

    func fetchAudioFeaturesForTracks(ids: [String]) async throws -> [String: AudioFeatures] {
        guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        return try await fetchAudioFeatures(ids: ids, network: network)
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
    guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        let chunkSize = 100
        let chunks = stride(from: 0, to: uris.count, by: chunkSize).map { Array(uris[$0..<min(uris.count, $0+chunkSize)]) }
        let total = chunks.count

        for (i, chunk) in chunks.enumerated() {
            let url = URL(string: "\(baseURL)/playlists/\(playlistId)/tracks")!
            let body = try JSONSerialization.data(withJSONObject: ["uris": chunk])
            let (_, resp) = try await network.sendRaw(url: url, method: "POST", body: body)
            if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                throw ClientError.httpError(code: http.statusCode)
            }
            progress?(i + 1, total)
        }
    }

    /// Remove (unlike) saved tracks from the user's library in chunks.
    func removeSavedTracks(auth: SpotifyAuth, ids: [String], progress: ((Int, Int) -> Void)? = nil) async throws {
        guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        let chunkSize = 50
        let chunks = stride(from: 0, to: ids.count, by: chunkSize).map { Array(ids[$0..<min(ids.count, $0+chunkSize)]) }
        let total = chunks.count

        for (i, chunk) in chunks.enumerated() {
            let url = URL(string: "\(baseURL)/me/tracks?ids=\(chunk.joined(separator: ","))")!
            let (_, resp) = try await network.sendRaw(url: url, method: "DELETE", body: nil)
            if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                throw ClientError.httpError(code: http.statusCode)
            }
            progress?(i + 1, total)
        }
    }

    // Helper to get current access token from Keychain (used by internal calls)
    private func currentAccessToken() throws -> String {
        // Deprecated: prefer using SpotifyAuth.getValidAccessToken(). Kept for compatibility.
        if let token = try? KeychainStore.loadToken(key: tokenKey) {
            if token.expiresAt > Date().timeIntervalSince1970 { return token.accessToken }
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
            var deduped = [String: Track]()
            for track in value { deduped[track.id] = track }
            return GenreGroup(name: key, tracks: Array(deduped.values), mappedPlaylistId: nil)
        }
        .sorted { $0.name < $1.name }
    }

    static func applyGenres(to tracks: [Track], artists: [Artist]) -> [Track] {
        var artistById = [String: Artist]()
        for a in artists { artistById[a.id] = a }

        return tracks.map { track in
            var merged: [String] = []
            for aid in track.artistIds {
                if let ar = artistById[aid], !ar.genres.isEmpty {
                    merged.append(contentsOf: ar.genres)
                }
            }
            var updated = track
            let unique = Array(Set(merged)).sorted()
            updated.genres = unique.isEmpty ? ["(Unknown)"] : unique
            return updated
        }
    }

    static func groupTracksByFeature(tracks: [Track], features: [String: AudioFeatures], sortBy: SortBy) -> [GenreGroup] {
        var buckets: [String: [Track]] = [:]
        for t in tracks {
            guard let f = features[t.id] else {
                buckets["(Unknown)", default: []].append(t)
                continue
            }
            let label: String
            switch sortBy {
            case .bpm:
                label = bucketLabel(value: f.tempo, low: 90, high: 130, prefix: "BPM")
            case .energy:
                label = bucketLabel(value: f.energy, low: 0.33, high: 0.66, prefix: "Energy")
            case .danceability:
                label = bucketLabel(value: f.danceability, low: 0.33, high: 0.66, prefix: "Danceability")
            case .valence:
                label = bucketLabel(value: f.valence, low: 0.33, high: 0.66, prefix: "Valence")
            case .genre:
                label = "(Unknown)"
            }
            buckets[label, default: []].append(t)
        }

        return buckets.map { key, value in
            var deduped = [String: Track]()
            for track in value { deduped[track.id] = track }
            return GenreGroup(name: key, tracks: Array(deduped.values), mappedPlaylistId: nil)
        }
        .sorted { $0.name < $1.name }
    }

    static func extractGenres(from artists: [Artist]) -> [String] {
        let all = artists.flatMap { $0.genres }
        let unique = Array(Set(all)).filter { !$0.isEmpty }
        return unique.sorted()
    }

    func genresForPlaylist(_ playlistId: String) -> Set<String> {
        let list = playlistGenreFilters[playlistId] ?? []
        return Set(list)
    }

    func setGenres(_ genres: Set<String>, for playlistId: String) {
        playlistGenreFilters[playlistId] = Array(genres).sorted()
        try? cache.savePlaylistGenreFilters(map: playlistGenreFilters)
    }

    private static func bucketLabel(value: Double, low: Double, high: Double, prefix: String) -> String {
        if value < low { return "\(prefix) • Low" }
        if value < high { return "\(prefix) • Medium" }
        return "\(prefix) • High"
    }
}
