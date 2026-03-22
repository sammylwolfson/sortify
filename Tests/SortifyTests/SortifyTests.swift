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
        // word: {"indie","rock"} vs {"indie","pop"} -> 1/3 -> 0.6 * 0.333 = 0.2
        // co: {a1,a2,a3} vs {a1,a2,a4} -> 2/4 = 0.5 -> 0.4 * 0.5 = 0.2
        // total = 0.4
        XCTAssertGreaterThanOrEqual(score, 0.4)
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
        // Build artists that share genres to boost co-occurrence
        let artists = [
            Artist(id: "a1", name: "A1", genres: ["indie rock", "alternative rock"]),
            Artist(id: "a2", name: "A2", genres: ["indie rock", "alternative rock"]),
            Artist(id: "a3", name: "A3", genres: ["indie rock"]),
            Artist(id: "a4", name: "A4", genres: ["alternative rock"]),
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
}
