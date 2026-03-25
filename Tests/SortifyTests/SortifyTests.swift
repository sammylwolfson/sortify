import XCTest
@testable import Sortify

final class SortifyTests: XCTestCase {
    func testTokenDecoding() throws {
        let json = "{"
            + "\"access_token\":\"abc123\","
            + "\"refresh_token\":\"ref456\","
            + "\"expires_in\":3600,"
            + "\"scope\":\"user-library-read\","
            + "\"token_type\":\"Bearer\""
            + "}"
        let data = Data(json.utf8)
        let decoder = JSONDecoder()
        let resp = try decoder.decode(Sortify.TokenResponse.self, from: data)
        XCTAssertEqual(resp.access_token, "abc123")
        XCTAssertEqual(resp.refresh_token, "ref456")
        XCTAssertEqual(Int(resp.expires_in), 3600)
    }

    // MARK: - groupTracksByGenre tests

    func testGroupsByGenre() {
        let tracks = [
            Track(id: "t1", name: "Song A", artistIds: ["a1"], artistNames: ["Artist 1"], albumName: nil, uri: "spotify:track:t1"),
            Track(id: "t2", name: "Song B", artistIds: ["a2"], artistNames: ["Artist 2"], albumName: nil, uri: "spotify:track:t2"),
        ]
        let artists = [
            Artist(id: "a1", name: "Artist 1", genres: ["rock", "pop"]),
            Artist(id: "a2", name: "Artist 2", genres: ["jazz"]),
        ]

        let groups = SpotifyClient.groupTracksByGenre(tracks: tracks, artists: artists)
        let names = Set(groups.map { $0.name })

        XCTAssertEqual(names, ["jazz", "pop", "rock"])
        XCTAssertEqual(groups.first(where: { $0.name == "rock" })?.tracks.count, 1)
        XCTAssertEqual(groups.first(where: { $0.name == "pop" })?.tracks.count, 1)
        XCTAssertEqual(groups.first(where: { $0.name == "jazz" })?.tracks.count, 1)
    }

    func testUnknownGenreBucket() {
        let tracks = [
            Track(id: "t1", name: "Song A", artistIds: ["a1"], artistNames: ["Artist 1"], albumName: nil, uri: "spotify:track:t1"),
        ]
        let artists = [
            Artist(id: "a1", name: "Artist 1", genres: []),
        ]

        let groups = SpotifyClient.groupTracksByGenre(tracks: tracks, artists: artists)

        XCTAssertEqual(groups.count, 1)
        XCTAssertEqual(groups[0].name, "(Unknown)")
        XCTAssertEqual(groups[0].tracks.count, 1)
    }

    func testDeduplicatesTracksWithinGenre() {
        // Track with two artists in the same genre should appear only once
        let tracks = [
            Track(id: "t1", name: "Collab", artistIds: ["a1", "a2"], artistNames: ["A1", "A2"], albumName: nil, uri: "spotify:track:t1"),
        ]
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["rock"]),
            Artist(id: "a2", name: "A2", genres: ["rock"]),
        ]

        let groups = SpotifyClient.groupTracksByGenre(tracks: tracks, artists: artists)
        let rockGroup = groups.first(where: { $0.name == "rock" })

        XCTAssertNotNil(rockGroup)
        XCTAssertEqual(rockGroup?.tracks.count, 1)
    }

    func testGroupsSortedAlphabetically() {
        let tracks = [
            Track(id: "t1", name: "S1", artistIds: ["a1"], artistNames: ["A"], albumName: nil, uri: "u:1"),
            Track(id: "t2", name: "S2", artistIds: ["a2"], artistNames: ["B"], albumName: nil, uri: "u:2"),
        ]
        let artists = [
            Artist(id: "a1", name: "A", genres: ["z-genre"]),
            Artist(id: "a2", name: "B", genres: ["a-genre"]),
        ]

        let groups = SpotifyClient.groupTracksByGenre(tracks: tracks, artists: artists)

        XCTAssertEqual(groups[0].name, "a-genre")
        XCTAssertEqual(groups[1].name, "z-genre")
    }

    func testMissingArtistGoesToUnknown() {
        // Track references an artist ID not in the artists list
        let tracks = [
            Track(id: "t1", name: "Orphan", artistIds: ["missing"], artistNames: ["???"], albumName: nil, uri: "u:1"),
        ]
        let artists: [Artist] = []

        let groups = SpotifyClient.groupTracksByGenre(tracks: tracks, artists: artists)

        XCTAssertEqual(groups.count, 1)
        XCTAssertEqual(groups[0].name, "(Unknown)")
    }

    // MARK: - Decade extraction tests

    func testDecadeExtractionFullDate() {
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, releaseDate: "2023-01-15", uri: "u:1")
        XCTAssertEqual(track.decade, "2020s")
    }

    func testDecadeExtractionYearMonth() {
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, releaseDate: "1987-06", uri: "u:1")
        XCTAssertEqual(track.decade, "1980s")
    }

    func testDecadeExtractionYearOnly() {
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, releaseDate: "1995", uri: "u:1")
        XCTAssertEqual(track.decade, "1990s")
    }

    func testDecadeExtractionNilDate() {
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, uri: "u:1")
        XCTAssertNil(track.decade)
    }

    // MARK: - Genre + Decade grouping tests

    func testGroupByGenreAndDecade() {
        let tracks = [
            Track(id: "t1", name: "S1", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, releaseDate: "1995-03-01", uri: "u:1"),
            Track(id: "t2", name: "S2", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, releaseDate: "2015-01-01", uri: "u:2"),
        ]
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["rock"]),
        ]

        let groups = SpotifyClient.groupTracksByGenreAndDecade(tracks: tracks, artists: artists)
        let names = Set(groups.map { $0.name })

        XCTAssertTrue(names.contains("1990s rock"))
        XCTAssertTrue(names.contains("2010s rock"))
        XCTAssertEqual(groups.first(where: { $0.name == "1990s rock" })?.tracks.count, 1)
        XCTAssertEqual(groups.first(where: { $0.name == "2010s rock" })?.tracks.count, 1)
    }

    func testGroupByGenreAndDecadeUnknownDecade() {
        let tracks = [
            Track(id: "t1", name: "S1", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, uri: "u:1"),
        ]
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["pop"]),
        ]

        let groups = SpotifyClient.groupTracksByGenreAndDecade(tracks: tracks, artists: artists)
        XCTAssertTrue(groups.contains(where: { $0.name == "Unknown Decade pop" }))
    }

    // MARK: - Smart name tests

    func testSmartNamePlainGenre() {
        XCTAssertEqual(SuggestionEngine.smartName(for: "indie rock"), "Indie Rock")
    }

    func testSmartNameWithDecade90s() {
        XCTAssertEqual(SuggestionEngine.smartName(for: "1990s indie rock"), "90s Indie Rock")
    }

    func testSmartNameWithDecade2010s() {
        XCTAssertEqual(SuggestionEngine.smartName(for: "2010s electronic"), "10s Electronic")
    }

    func testSmartNameWithDecade2000s() {
        XCTAssertEqual(SuggestionEngine.smartName(for: "2000s hip hop"), "2000s Hip Hop")
    }

    // MARK: - Genre similarity tests

    func testGenreSimilarityWordStem() {
        let coOccurrence: [String: Set<String>] = [:]
        let score = SuggestionEngine.genreSimilarity("indie rock", "alternative rock", coOccurrence: coOccurrence)
        // "rock" is shared, Jaccard of {"indie","rock"} and {"alternative","rock"} = 1/3
        // word similarity = 0.6 * (1/3) = 0.2
        XCTAssertGreaterThan(score, 0)
        XCTAssertLessThan(score, 1.0)
    }

    func testGenreSimilarityCoOccurrence() {
        let coOccurrence: [String: Set<String>] = [
            "indie rock": Set(["a1", "a2", "a3"]),
            "indie pop": Set(["a1", "a2", "a4"]),
        ]
        let score = SuggestionEngine.genreSimilarity("indie rock", "indie pop", coOccurrence: coOccurrence)
        // word: {"indie","rock"} vs {"indie","pop"} -> 1/3 -> 0.5 * 0.333 = 0.167
        // substring: no containment -> 0
        // co: {a1,a2,a3} vs {a1,a2,a4} -> 2/4 = 0.5 -> 0.4 * 0.5 = 0.2
        // total ≈ 0.367
        XCTAssertGreaterThanOrEqual(score, 0.35)
    }

    func testGenreSimilarityUnrelated() {
        let coOccurrence: [String: Set<String>] = [
            "jazz": Set(["a1"]),
            "metal": Set(["a2"]),
        ]
        let score = SuggestionEngine.genreSimilarity("jazz", "metal", coOccurrence: coOccurrence)
        XCTAssertEqual(score, 0.0)
    }

    // MARK: - Suggestion tests

    func testNewPlaylistSuggestion() {
        let tracks = (0..<12).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: [], artistNames: [], albumName: nil, uri: "u:\(i)")
        }
        let groups = [GenreGroup(name: "rock", tracks: tracks, mappedPlaylistId: nil)]
        let mapping: [String: String] = [:]

        let suggestions = SuggestionEngine.newPlaylistSuggestions(groups: groups, playlistMapping: mapping)

        XCTAssertEqual(suggestions.count, 1)
        if case .createPlaylist(let name, let count, let suggested) = suggestions[0] {
            XCTAssertEqual(name, "rock")
            XCTAssertEqual(count, 12)
            XCTAssertEqual(suggested, "Rock")
        } else {
            XCTFail("Expected createPlaylist suggestion")
        }
    }

    func testNoSuggestionWhenMapped() {
        let tracks = (0..<12).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: [], artistNames: [], albumName: nil, uri: "u:\(i)")
        }
        let groups = [GenreGroup(name: "rock", tracks: tracks, mappedPlaylistId: "p1")]
        let mapping = ["rock": "p1"]

        let suggestions = SuggestionEngine.newPlaylistSuggestions(groups: groups, playlistMapping: mapping)
        XCTAssertTrue(suggestions.isEmpty)
    }

    func testNoSuggestionWhenFewTracks() {
        let tracks = (0..<5).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: [], artistNames: [], albumName: nil, uri: "u:\(i)")
        }
        let groups = [GenreGroup(name: "rock", tracks: tracks, mappedPlaylistId: nil)]
        let mapping: [String: String] = [:]

        let suggestions = SuggestionEngine.newPlaylistSuggestions(groups: groups, playlistMapping: mapping)
        XCTAssertTrue(suggestions.isEmpty)
    }

    func testCombineSuggestion() {
        let tracks1 = (0..<5).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: [], artistNames: [], albumName: nil, uri: "u:\(i)")
        }
        let tracks2 = (5..<10).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: [], artistNames: [], albumName: nil, uri: "u:\(i)")
        }
        let groups = [
            GenreGroup(name: "indie rock", tracks: tracks1, mappedPlaylistId: nil),
            GenreGroup(name: "alternative rock", tracks: tracks2, mappedPlaylistId: nil),
        ]
        // Build artists that share genres to boost co-occurrence above threshold
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["indie rock", "alternative rock"]),
            Artist(id: "a2", name: "A2", genres: ["indie rock", "alternative rock"]),
            Artist(id: "a3", name: "A3", genres: ["indie rock", "alternative rock"]),
            Artist(id: "a4", name: "A4", genres: ["indie rock"]),
            Artist(id: "a5", name: "A5", genres: ["alternative rock"]),
        ]

        let suggestions = SuggestionEngine.combineSuggestions(groups: groups, artists: artists)
        XCTAssertFalse(suggestions.isEmpty)
        if case .combineGenres(let g1, let g2, _, let score) = suggestions[0] {
            XCTAssertTrue((g1 == "indie rock" && g2 == "alternative rock") || (g1 == "alternative rock" && g2 == "indie rock"))
            XCTAssertGreaterThanOrEqual(score, SuggestionEngine.combineSimilarityThreshold)
        } else {
            XCTFail("Expected combineGenres suggestion")
        }
    }

    // MARK: - Tokenize decade filtering bug fix

    func testTokenizeFiltersFullDecadeTokens() {
        // "1990s" should be filtered out as a decade token (bug fix: was checking 190-209 instead of 1900-2099)
        let tokens = SuggestionEngine.tokenize("1990s rock")
        XCTAssertEqual(tokens, ["rock"])
    }

    func testTokenizeFilters2010sDecadeToken() {
        let tokens = SuggestionEngine.tokenize("2010s electronic")
        XCTAssertEqual(tokens, ["electronic"])
    }

    func testTokenizePreservesNonDecadeTokens() {
        let tokens = SuggestionEngine.tokenize("indie rock")
        XCTAssertEqual(Set(tokens), Set(["indie", "rock"]))
    }

    // MARK: - Substring containment similarity boost

    func testSimilaritySubstringBoost() {
        // "rock" is a substring of "indie rock" — should get a containment boost
        let coOccurrence: [String: Set<String>] = [:]
        let score = SuggestionEngine.genreSimilarity("rock", "indie rock", coOccurrence: coOccurrence)
        // Without boost: Jaccard {"rock"} vs {"indie","rock"} = 1/2 -> 0.5 * 0.5 = 0.25
        // With boost: + 0.1 * 1.0 = 0.35
        XCTAssertGreaterThanOrEqual(score, 0.35)
    }

    func testSimilarityNoSubstringBoostForIdenticalNames() {
        // Identical names should not get substring boost (they'd match perfectly on Jaccard already)
        let coOccurrence: [String: Set<String>] = [:]
        let score = SuggestionEngine.genreSimilarity("rock", "rock", coOccurrence: coOccurrence)
        // Jaccard = 1.0, substring boost = 0 (names are equal), co-occurrence = 0
        // 0.5 * 1.0 + 0.1 * 0.0 + 0.4 * 0.0 = 0.5
        XCTAssertEqual(score, 0.5, accuracy: 0.01)
    }

    // MARK: - Co-occurrence map test

    func testBuildCoOccurrenceMap() {
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["rock", "pop"]),
            Artist(id: "a2", name: "A2", genres: ["rock", "jazz"]),
        ]
        let map = SuggestionEngine.buildCoOccurrenceMap(artists: artists)
        XCTAssertEqual(map["rock"], Set(["a1", "a2"]))
        XCTAssertEqual(map["pop"], Set(["a1"]))
        XCTAssertEqual(map["jazz"], Set(["a2"]))
    }

    // MARK: - PlaylistFilter matching tests

    func testFilterMatchesAnyGenre() {
        let filter = PlaylistFilter(
            playlistId: "p1", playlistName: "Rock Mix",
            genres: ["rock", "metal"], decades: [], matchMode: .anyGenre
        )
        let track = Track(id: "t1", name: "S", artistIds: ["a1"], artistNames: ["A"], albumName: nil, releaseDate: "2020-01-01", uri: "u:1")

        XCTAssertTrue(filter.matches(track: track, trackGenres: ["rock", "pop"]))
        XCTAssertTrue(filter.matches(track: track, trackGenres: ["metal"]))
        XCTAssertFalse(filter.matches(track: track, trackGenres: ["jazz", "blues"]))
        XCTAssertFalse(filter.matches(track: track, trackGenres: []))
    }

    func testFilterMatchesAllGenres() {
        let filter = PlaylistFilter(
            playlistId: "p1", playlistName: "Specific",
            genres: ["rock", "indie"], decades: [], matchMode: .allGenres
        )
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, uri: "u:1")

        // Both filter genres must be present in track's genres
        XCTAssertTrue(filter.matches(track: track, trackGenres: ["rock", "indie", "pop"]))
        XCTAssertFalse(filter.matches(track: track, trackGenres: ["rock", "pop"]))
    }

    func testFilterMatchesGenreAndDecade() {
        let filter = PlaylistFilter(
            playlistId: "p1", playlistName: "90s Rock",
            genres: ["rock"], decades: ["1990s"], matchMode: .genreAndDecade
        )
        let track90s = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, releaseDate: "1995-06-01", uri: "u:1")
        let track2020s = Track(id: "t2", name: "S2", artistIds: [], artistNames: [], albumName: nil, releaseDate: "2022-01-01", uri: "u:2")

        XCTAssertTrue(filter.matches(track: track90s, trackGenres: ["rock"]))
        XCTAssertFalse(filter.matches(track: track2020s, trackGenres: ["rock"])) // wrong decade
        XCTAssertFalse(filter.matches(track: track90s, trackGenres: ["jazz"])) // wrong genre
    }

    func testFilterEmptyGenresMatchesAnything() {
        let filter = PlaylistFilter(
            playlistId: "p1", playlistName: "All",
            genres: [], decades: [], matchMode: .anyGenre
        )
        let track = Track(id: "t1", name: "S", artistIds: [], artistNames: [], albumName: nil, uri: "u:1")
        XCTAssertTrue(filter.matches(track: track, trackGenres: ["anything"]))
        XCTAssertTrue(filter.matches(track: track, trackGenres: []))
    }

    // MARK: - PlaylistAnalyzer tests

    func testAnalyzerRecommendation() {
        let tracks = [
            Track(id: "t1", name: "S1", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, releaseDate: "1995-01-01", uri: "u:1"),
            Track(id: "t2", name: "S2", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, releaseDate: "1998-06-01", uri: "u:2"),
            Track(id: "t3", name: "S3", artistIds: ["a2"], artistNames: ["A2"], albumName: nil, releaseDate: "1992-03-01", uri: "u:3"),
            Track(id: "t4", name: "S4", artistIds: ["a2"], artistNames: ["A2"], albumName: nil, releaseDate: "2015-01-01", uri: "u:4"),
        ]
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["rock", "grunge"]),
            Artist(id: "a2", name: "A2", genres: ["rock", "alternative"]),
        ]

        let rec = PlaylistAnalyzer.recommend(playlistId: "p1", playlistName: "My Rock", tracks: tracks, artists: artists)

        // rock should be top genre (all 4 tracks)
        XCTAssertEqual(rec.topGenres.first?.genre, "rock")
        XCTAssertEqual(rec.topGenres.first?.percentage, 100.0)

        // 1990s should be dominant decade (3 of 4 tracks)
        XCTAssertTrue(rec.topDecades.contains(where: { $0.decade == "1990s" }))

        // rock should be in suggested filter genres (>= 15% threshold)
        XCTAssertTrue(rec.suggestedFilter.genres.contains("rock"))
    }

    func testAnalyzerEmptyPlaylist() {
        let rec = PlaylistAnalyzer.recommend(playlistId: "p1", playlistName: "Empty", tracks: [], artists: [])
        XCTAssertTrue(rec.topGenres.isEmpty)
        XCTAssertTrue(rec.topDecades.isEmpty)
        XCTAssertTrue(rec.suggestedFilter.genres.isEmpty)
    }

    func testAnalyzerDecadeDetection() {
        // If dominant decade >= 50%, mode should be genreAndDecade
        let tracks = (0..<10).map { i in
            Track(id: "t\(i)", name: "S\(i)", artistIds: ["a1"], artistNames: ["A1"], albumName: nil, releaseDate: "199\(i % 10)-01-01", uri: "u:\(i)")
        }
        let artists = [Artist(id: "a1", name: "A1", genres: ["rock"])]

        let rec = PlaylistAnalyzer.recommend(playlistId: "p1", playlistName: "90s", tracks: tracks, artists: artists)
        // All tracks are 1990s, so decade is 100%
        XCTAssertEqual(rec.suggestedFilter.matchMode, .genreAndDecade)
    }

    // MARK: - Filter recommendation summary

    func testFilterRecommendationSummary() {
        let rec = FilterRecommendation(
            playlistId: "p1",
            playlistName: "Test",
            topGenres: [(genre: "rock", percentage: 80.0), (genre: "pop", percentage: 20.0)],
            topDecades: [(decade: "1990s", percentage: 60.0)],
            suggestedFilter: PlaylistFilter(playlistId: "p1", playlistName: "Test", genres: ["rock"], decades: ["1990s"], matchMode: .anyGenre)
        )
        let summary = rec.summary
        XCTAssertTrue(summary.contains("rock"))
        XCTAssertTrue(summary.contains("1990s"))
    }
}
