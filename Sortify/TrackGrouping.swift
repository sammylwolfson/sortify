import Foundation

/// Pure-logic track grouping functions, extracted so they can be
/// compiled and tested without macOS framework dependencies.
enum TrackGrouping {
    static func groupTracks(tracks: [Track], artists: [Artist], mode: GroupingMode) -> [GenreGroup] {
        switch mode {
        case .genreOnly:
            return groupTracksByGenre(tracks: tracks, artists: artists)
        case .genreAndDecade:
            return groupTracksByGenreAndDecade(tracks: tracks, artists: artists)
        }
    }

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
