import Foundation

/// Analyzes playlist contents and recommends filter settings.
struct PlaylistAnalyzer {
    /// Minimum percentage a genre must have to be included in the recommended filter.
    static let genreThreshold = 15.0
    /// Minimum percentage a decade must have to be included in the recommended filter.
    static let decadeThreshold = 20.0

    /// Analyze a playlist's tracks and produce a filter recommendation.
    static func recommend(
        playlistId: String,
        playlistName: String,
        tracks: [Track],
        artists: [Artist]
    ) -> FilterRecommendation {
        guard !tracks.isEmpty else {
            return FilterRecommendation(
                playlistId: playlistId,
                playlistName: playlistName,
                topGenres: [],
                topDecades: [],
                suggestedFilter: PlaylistFilter(
                    playlistId: playlistId,
                    playlistName: playlistName,
                    genres: [],
                    decades: [],
                    matchMode: .anyGenre
                )
            )
        }

        let artistById = Dictionary(uniqueKeysWithValues: artists.map { ($0.id, $0) })

        // Count genre occurrences across all tracks
        var genreCounts: [String: Int] = [:]
        var decadeCounts: [String: Int] = [:]
        let trackCount = Double(tracks.count)

        for track in tracks {
            // Genres
            var trackGenres = Set<String>()
            for aid in track.artistIds {
                if let artist = artistById[aid] {
                    for g in artist.genres { trackGenres.insert(g) }
                }
            }
            for g in trackGenres {
                genreCounts[g, default: 0] += 1
            }

            // Decades
            if let decade = track.decade {
                decadeCounts[decade, default: 0] += 1
            }
        }

        // Sort by frequency
        let topGenres = genreCounts
            .map { (genre: $0.key, percentage: Double($0.value) / trackCount * 100) }
            .sorted { $0.percentage > $1.percentage }

        let topDecades = decadeCounts
            .map { (decade: $0.key, percentage: Double($0.value) / trackCount * 100) }
            .sorted { $0.percentage > $1.percentage }

        // Build recommended filter: include genres/decades above threshold
        let filteredGenres = topGenres.filter { $0.percentage >= genreThreshold }.map { $0.genre }
        let filteredDecades = topDecades.filter { $0.percentage >= decadeThreshold }.map { $0.decade }

        // Determine best match mode
        let matchMode: PlaylistFilter.MatchMode
        if !filteredGenres.isEmpty && !filteredDecades.isEmpty {
            // If the playlist has strong decade clustering, use genre+decade
            let topDecadePct = topDecades.first?.percentage ?? 0
            if topDecadePct >= 50 {
                matchMode = .genreAndDecade
            } else {
                matchMode = .anyGenre
            }
        } else {
            matchMode = .anyGenre
        }

        let suggestedFilter = PlaylistFilter(
            playlistId: playlistId,
            playlistName: playlistName,
            genres: filteredGenres,
            decades: filteredDecades,
            matchMode: matchMode
        )

        return FilterRecommendation(
            playlistId: playlistId,
            playlistName: playlistName,
            topGenres: topGenres,
            topDecades: topDecades,
            suggestedFilter: suggestedFilter
        )
    }
}
