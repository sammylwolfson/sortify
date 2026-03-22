import Foundation

enum Suggestion: Identifiable {
    case createPlaylist(genreName: String, trackCount: Int, suggestedName: String)
    case combineGenres(genre1: String, genre2: String, suggestedName: String, similarityScore: Double)

    var id: String {
        switch self {
        case .createPlaylist(let g, _, _): return "create-\(g)"
        case .combineGenres(let g1, let g2, _, _): return "combine-\(g1)-\(g2)"
        }
    }
}

struct SuggestionEngine {
    static let minTracksForPlaylistSuggestion = 10
    static let combineSimilarityThreshold = 0.4

    // MARK: - New Playlist Suggestions

    static func newPlaylistSuggestions(
        groups: [GenreGroup],
        playlistMapping: [String: String]
    ) -> [Suggestion] {
        groups.compactMap { group in
            guard group.tracks.count >= minTracksForPlaylistSuggestion,
                  playlistMapping[group.name] == nil
            else { return nil }
            let name = smartName(for: group.name)
            return .createPlaylist(genreName: group.name, trackCount: group.tracks.count, suggestedName: name)
        }
    }

    // MARK: - Combine Similar Genres

    static func combineSuggestions(
        groups: [GenreGroup],
        artists: [Artist]
    ) -> [Suggestion] {
        guard groups.count >= 2 else { return [] }

        let coOccurrence = buildCoOccurrenceMap(artists: artists)

        // Build token-based inverted index for efficient comparison
        var tokenIndex: [String: [Int]] = [:]
        for (i, group) in groups.enumerated() {
            for token in tokenize(group.name) {
                tokenIndex[token, default: []].append(i)
            }
        }

        var seen = Set<String>()
        var results: [Suggestion] = []

        for (_, indices) in tokenIndex {
            guard indices.count >= 2 else { continue }
            for i in 0..<indices.count {
                for j in (i+1)..<indices.count {
                    let a = groups[indices[i]]
                    let b = groups[indices[j]]
                    let pairKey = "\(min(a.name, b.name))|\(max(a.name, b.name))"
                    guard !seen.contains(pairKey) else { continue }
                    seen.insert(pairKey)

                    let score = genreSimilarity(a.name, b.name, coOccurrence: coOccurrence)
                    if score >= combineSimilarityThreshold {
                        let name = a.tracks.count >= b.tracks.count ? smartName(for: a.name) : smartName(for: b.name)
                        results.append(.combineGenres(genre1: a.name, genre2: b.name, suggestedName: name, similarityScore: score))
                    }
                }
            }
        }

        return results.sorted { $0.similarityScore > $1.similarityScore }
    }

    // MARK: - Genre Similarity

    static func genreSimilarity(_ a: String, _ b: String, coOccurrence: [String: Set<String>]) -> Double {
        let tokensA = Set(tokenize(a))
        let tokensB = Set(tokenize(b))

        // Word-stem Jaccard (weight 0.6)
        let intersection = tokensA.intersection(tokensB)
        let union = tokensA.union(tokensB)
        let wordSimilarity = union.isEmpty ? 0.0 : Double(intersection.count) / Double(union.count)

        // Co-occurrence Jaccard (weight 0.4)
        let artistsA = coOccurrence[a] ?? []
        let artistsB = coOccurrence[b] ?? []
        let coIntersection = artistsA.intersection(artistsB)
        let coUnion = artistsA.union(artistsB)
        let coSimilarity = coUnion.isEmpty ? 0.0 : Double(coIntersection.count) / Double(coUnion.count)

        return 0.6 * wordSimilarity + 0.4 * coSimilarity
    }

    // MARK: - Smart Name Generation

    static func smartName(for genreName: String) -> String {
        let parts = genreName.split(separator: " ")
        guard !parts.isEmpty else { return genreName }

        // Detect decade prefix like "1990s" or "2010s"
        if let first = parts.first,
           first.hasSuffix("s"),
           let year = Int(first.dropLast()),
           year >= 1900, year <= 2099 {
            let shortDecade: String
            if year < 2000 {
                shortDecade = "\(year % 100)s"  // "1990" -> "90s"
            } else if year == 2000 {
                shortDecade = "2000s"
            } else {
                shortDecade = "\(year % 100)s"  // "2010" -> "10s"
            }
            let rest = parts.dropFirst().map { $0.capitalized }.joined(separator: " ")
            return rest.isEmpty ? shortDecade : "\(shortDecade) \(rest)"
        }

        return parts.map { $0.capitalized }.joined(separator: " ")
    }

    // MARK: - Helpers

    static func buildCoOccurrenceMap(artists: [Artist]) -> [String: Set<String>] {
        var map: [String: Set<String>] = [:]
        for a in artists {
            for g in a.genres {
                map[g, default: []].insert(a.id)
            }
        }
        return map
    }

    static func tokenize(_ name: String) -> [String] {
        // Remove decade prefix tokens for similarity comparison of the genre part
        let parts = name.lowercased()
            .split(separator: " ")
            .flatMap { $0.split(separator: "-") }
            .map(String.init)

        // Filter out decade tokens like "1990s", "2010s", "unknown"
        return parts.filter { token in
            if token.hasSuffix("s"), let year = Int(token.dropLast()), year >= 190, year <= 209 {
                return false
            }
            if token == "unknown" || token == "decade" { return false }
            return true
        }
    }
}

private extension Suggestion {
    var similarityScore: Double {
        switch self {
        case .combineGenres(_, _, _, let score): return score
        default: return 0
        }
    }
}
