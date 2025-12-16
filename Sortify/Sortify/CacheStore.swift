import Foundation

final class CacheStore {
    static let shared = CacheStore()
    private init() {}

    struct CachedPayload: Codable {
        var tracks: [Track]
        var artists: [Artist]
        var savedAt: Date
    }

    private var cacheURL: URL? {
        let fm = FileManager.default
        if let appSupport = try? fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) {
            let dir = appSupport.appendingPathComponent("Sortify", isDirectory: true)
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
            return dir.appendingPathComponent("cache.json")
        }
        return nil
    }

    func save(tracks: [Track], artists: [Artist]) throws {
        let payload = CachedPayload(tracks: tracks, artists: artists, savedAt: Date())
        guard let url = cacheURL else { return }
        let data = try JSONEncoder().encode(payload)
        try data.write(to: url)
    }

    func loadCachedTracks() throws -> CachedPayload? {
        guard let url = cacheURL else { return nil }
        let data = try Data(contentsOf: url)
        let payload = try JSONDecoder().decode(CachedPayload.self, from: data)
        return payload
    }

    // Playlist mapping persistence
    private var mappingURL: URL? {
        let fm = FileManager.default
        if let appSupport = try? fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) {
            let dir = appSupport.appendingPathComponent("Sortify", isDirectory: true)
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
            return dir.appendingPathComponent("playlist-mapping.json")
        }
        return nil
    }

    func savePlaylistMapping(map: [String: String]) throws {
        guard let url = mappingURL else { return }
        let data = try JSONEncoder().encode(map)
        try data.write(to: url)
    }

    func loadPlaylistMapping() throws -> [String: String]? {
        guard let url = mappingURL else { return nil }
        let data = try Data(contentsOf: url)
        let map = try JSONDecoder().decode([String: String].self, from: data)
        return map
    }
}
