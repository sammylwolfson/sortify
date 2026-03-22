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
}
