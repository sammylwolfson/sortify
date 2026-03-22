import Foundation
import Combine

@MainActor
final class SpotifyClient: ObservableObject {
    // ref to auth so we can request tokens when sending requests
    weak var auth: SpotifyAuth?

    @Published var playlists: [Playlist] = []
    @Published var genreGroups: [GenreGroup] = []
    @Published var isLoading = false
    @Published var lastError: Error?
    @Published var suggestions: [String: [Suggestion]] = [:]
    @Published var groupingMode: GroupingMode = .genreOnly {
        didSet { regroupFromCache() }
    }

    private let baseURL = "https://api.spotify.com/v1"
    // single NetworkClient instance per SpotifyClient (created when auth is set)
    private var networkClient: NetworkClient? = nil

    func configureNetwork(with auth: SpotifyAuth) {
        self.networkClient = NetworkClient(auth: auth)
    }

    // A lightweight cache
    private let cache = CacheStore.shared
    // in-memory mapping of genre -> playlistId
    private(set) var playlistMapping: [String: String] = [:]

    // Cached data for re-grouping without network calls
    private var cachedTracks: [Track] = []
    private var cachedArtists: [Artist] = []

    // Dismissed suggestion IDs
    private var dismissedSuggestionIds: Set<String> = []

    init() {
        if let cached = try? cache.loadCachedTracks() {
            self.cachedTracks = cached.tracks
            self.cachedArtists = cached.artists
            self.genreGroups = Self.groupTracksByGenre(tracks: cached.tracks, artists: cached.artists)
        }
        if let map = try? cache.loadPlaylistMapping() {
            self.playlistMapping = map
        }
        if let dismissed = try? cache.loadDismissedSuggestions() {
            self.dismissedSuggestionIds = dismissed
        }
        recomputeSuggestions()
    }

    // Fetch saved tracks (paginated)
    func fetchLikedSongsAndGroup(auth: SpotifyAuth, completion: @escaping (Result<Void, Error>) -> Void) {
        lastError = nil
        Task {
            do {
                let groups = try await fetchLikedSongsAndGroupAsync()
                DispatchQueue.main.async {
                    self.genreGroups = groups
                    completion(.success(()))
                }
            } catch {
                DispatchQueue.main.async {
                    self.lastError = error
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
            let pageURL = URL(string: "\(baseURL)/me/tracks?limit=\(limit)&offset=\(offset)")!
            let page: SavedTracksResponse = try await network.send(pageURL)
            for item in page.items {
                if let tr = item.track {
                    let t = Track(id: tr.id, name: tr.name, artistIds: tr.artists.compactMap { $0.id }, artistNames: tr.artists.compactMap { $0.name }, albumName: tr.album?.name, releaseDate: tr.album?.release_date, uri: tr.uri)
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

        // Cache for re-grouping
        self.cachedTracks = tracks
        self.cachedArtists = artists

        let groups = Self.groupTracks(tracks: tracks, artists: artists, mode: groupingMode)
        let mapped = groups.map { g -> GenreGroup in
            var copy = g
            copy.mappedPlaylistId = self.playlistMapping[g.name]
            return copy
        }
        do {
            try self.cache.save(tracks: tracks, artists: artists)
        } catch {
            print("[Sortify] Warning: failed to save cache: \(error)")
        }
        recomputeSuggestions()
        return mapped
    }

    func loadPlaylistMapping() {
        if let map = try? cache.loadPlaylistMapping() {
            self.playlistMapping = map
        }
    }

    func savePlaylistMapping() {
        do {
            try cache.savePlaylistMapping(map: playlistMapping)
        } catch {
            print("[Sortify] Warning: failed to save playlist mapping: \(error)")
        }
    }

    func setMapping(genre: String, playlistId: String?) {
        if let pid = playlistId {
            playlistMapping[genre] = pid
        } else {
            playlistMapping.removeValue(forKey: genre)
        }
        savePlaylistMapping()
        recomputeSuggestions()
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

    // MARK: - Playlist Creation

    /// Create a new playlist on Spotify and return it.
    func createPlaylistOnSpotify(name: String) async throws -> Playlist {
        guard let network = self.networkClient else { throw ClientError.notAuthenticated }
        let url = URL(string: "\(baseURL)/me/playlists")!
        let bodyDict: [String: Any] = ["name": name, "public": false]
        let body = try JSONSerialization.data(withJSONObject: bodyDict)
        let (data, resp) = try await network.sendRaw(url: url, method: "POST", body: body)
        if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw ClientError.httpError(code: http.statusCode)
        }
        let created = try JSONDecoder().decode(PlaylistItem.self, from: data)
        let playlist = Playlist(id: created.id, name: created.name)
        self.playlists.append(playlist)
        return playlist
    }

    // MARK: - Suggestion Actions

    func acceptCreatePlaylist(genreName: String, suggestedName: String) async throws {
        let playlist = try await createPlaylistOnSpotify(name: suggestedName)
        setMapping(genre: genreName, playlistId: playlist.id)
    }

    func acceptCombineGenres(genre1: String, genre2: String, targetPlaylistId: String) {
        setMapping(genre: genre1, playlistId: targetPlaylistId)
        setMapping(genre: genre2, playlistId: targetPlaylistId)
    }

    func dismissSuggestion(id: String) {
        dismissedSuggestionIds.insert(id)
        do {
            try cache.saveDismissedSuggestions(dismissedSuggestionIds)
        } catch {
            print("[Sortify] Warning: failed to save dismissed suggestions: \(error)")
        }
        recomputeSuggestions()
    }

    // MARK: - Regrouping

    private func regroupFromCache() {
        guard !cachedTracks.isEmpty else { return }
        let groups = Self.groupTracks(tracks: cachedTracks, artists: cachedArtists, mode: groupingMode)
        self.genreGroups = groups.map { g -> GenreGroup in
            var copy = g
            copy.mappedPlaylistId = self.playlistMapping[g.name]
            return copy
        }
        recomputeSuggestions()
    }

    private func recomputeSuggestions() {
        let newPlaylist = SuggestionEngine.newPlaylistSuggestions(
            groups: genreGroups,
            playlistMapping: playlistMapping
        )
        let combine = SuggestionEngine.combineSuggestions(
            groups: genreGroups,
            artists: cachedArtists
        )
        let all = newPlaylist + combine

        var grouped: [String: [Suggestion]] = [:]
        for s in all {
            guard !dismissedSuggestionIds.contains(s.id) else { continue }
            switch s {
            case .createPlaylist(let genreName, _, _):
                grouped[genreName, default: []].append(s)
            case .combineGenres(let g1, _, _, _):
                grouped[g1, default: []].append(s)
            }
        }
        self.suggestions = grouped
    }

    // MARK: - Suggestion Summary

    /// All active suggestions across all genres, flattened.
    var allSuggestions: [Suggestion] {
        suggestions.values.flatMap { $0 }
    }

    /// Count of create-playlist suggestions.
    var createSuggestionCount: Int {
        allSuggestions.filter {
            if case .createPlaylist = $0 { return true }
            return false
        }.count
    }

    /// Count of combine-genre suggestions.
    var combineSuggestionCount: Int {
        allSuggestions.filter {
            if case .combineGenres = $0 { return true }
            return false
        }.count
    }

    // MARK: - Grouping

    static func groupTracks(tracks: [Track], artists: [Artist], mode: GroupingMode) -> [GenreGroup] {
        switch mode {
        case .genreOnly:
            return groupTracksByGenre(tracks: tracks, artists: artists)
        case .genreAndDecade:
            return groupTracksByGenreAndDecade(tracks: tracks, artists: artists)
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

    static func groupTracksByGenreAndDecade(tracks: [Track], artists: [Artist]) -> [GenreGroup] {
        var artistById = [String: Artist]()
        for a in artists { artistById[a.id] = a }

        var groupMap: [String: [Track]] = [:]
        for t in tracks {
            var assigned = false
            let decade = t.decade ?? "Unknown Decade"
            for aid in t.artistIds {
                if let ar = artistById[aid], !ar.genres.isEmpty {
                    for g in ar.genres {
                        let key = "\(decade) \(g)"
                        groupMap[key, default: []].append(t)
                        assigned = true
                    }
                }
            }
            if !assigned {
                groupMap["(Unknown)", default: []].append(t)
            }
        }
        return groupMap.map { key, value in
            var deduped = [String: Track]()
            for track in value { deduped[track.id] = track }
            return GenreGroup(name: key, tracks: Array(deduped.values), mappedPlaylistId: nil)
        }
        .sorted { $0.name < $1.name }
    }
}
