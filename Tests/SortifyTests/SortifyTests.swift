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
        let resp = try decoder.decode(Sortify.SpotifyAPIModels.TokenResponse.self, from: data)
        XCTAssertEqual(resp.access_token, "abc123")
        XCTAssertEqual(resp.refresh_token, "ref456")
        XCTAssertEqual(Int(resp.expires_in), 3600)
    }
}
