import Foundation
import AuthenticationServices
import CryptoKit
import Network
import Combine

/// SpotifyAuth handles PKCE-based OAuth using ASWebAuthenticationSession and a tiny local HTTP listener on 127.0.0.1:8888
final class SpotifyAuth: ObservableObject {
    @Published var isSignedIn = false
    @Published var token: Token?

    private var server: SimpleLocalHTTPServer?
    private var currentSession: ASWebAuthenticationSession?
    private var cancellables = Set<AnyCancellable>()

    private let redirectURI = "http://127.0.0.1:8888/callback"
    // Replace with your app's client id; for packaging, consider allowing users to set this in Settings
    var clientId: String = "SPOTIFY_CLIENT_ID_PLACEHOLDER"
    private let scopes = "user-library-read playlist-modify-private playlist-modify-public playlist-read-private"

    private let keychainKey = "sortify.spotify.token"

    init() {
        // Prefer a client id supplied via Info.plist so you don't hardcode secrets in source.
        if let plistId = Bundle.main.object(forInfoDictionaryKey: "SortifySpotifyClientID") as? String,
           !plistId.isEmpty,
           plistId != "SPOTIFY_CLIENT_ID_PLACEHOLDER" {
            self.clientId = plistId
        }
        loadTokenFromKeychain()
    }

    /// Update client id at runtime (Settings UI can call this). Note: for production, prefer Info.plist or secure storage.
    func setClientId(_ id: String) {
        self.clientId = id
    }

    /// Return a valid access token, refreshing if needed. Async because refresh uses network.
    func getValidAccessToken() async throws -> String {
        if let t = token {
            if t.expiresAt > Date().timeIntervalSince1970 + 30 { // 30s leeway
                return t.accessToken
            }
            // attempt refresh
            if let refresh = t.refreshToken {
                do {
                    let refreshed = try await refreshAccessToken(refreshToken: refresh)
                    try storeToken(refreshed)
                    DispatchQueue.main.async {
                        self.token = refreshed
                        self.isSignedIn = true
                    }
                    return refreshed.accessToken
                } catch {
                    // refresh failed: sign out and surface unauthenticated
                    DispatchQueue.main.async {
                        self.signOut()
                    }
                    throw AuthError.unauthenticated
                }
            }
            throw AuthError.unauthenticated
        }
        throw AuthError.unauthenticated
    }

    /// Existing callback-based sign-in (used by UI). Also see `signIn()` async variant below.
    func signIn(completion: @escaping (Result<Void, Error>) -> Void) {
        // Start local server to capture callback
        server = SimpleLocalHTTPServer(port: 8888)
        server?.start { [weak self] result in
            switch result {
            case .success(let code):
                self?.exchangeCodeForToken(code: code, completion: completion)
            case .failure(let err):
                completion(.failure(err))
            }
        }

        // PKCE
        let codeVerifier = Self.generateCodeVerifier()
        let codeChallenge = Self.codeChallenge(from: codeVerifier)

        // Store verifier in-memory
        LocalPKCEStore.shared.set(verifier: codeVerifier)

        var comps = URLComponents(string: "https://accounts.spotify.com/authorize")!
        comps.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "scope", value: scopes),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "code_challenge", value: codeChallenge)
        ]

        guard let authURL = comps.url else { completion(.failure(AuthError.invalidAuthURL)); return }

        currentSession = ASWebAuthenticationSession(url: authURL, callbackURLScheme: nil) { callbackURL, error in
            // We rely on the local server to capture the code; ASWebAuthenticationSession can be used to present web UI only
            if let err = error {
                completion(.failure(err))
            } else {
                // wait for server to capture
            }
        }
        currentSession?.presentationContextProvider = PresentationProvider.shared
        currentSession?.start()
    }

    /// Async/await wrapper around the callback-based sign-in flow.
    func signIn() async throws {
        return try await withCheckedThrowingContinuation { cont in
            self.signIn { res in
                switch res {
                case .success(): cont.resume(returning: ())
                case .failure(let err): cont.resume(throwing: err)
                }
            }
        }
    }

    func signOut() {
        token = nil
        try? KeychainStore.delete(key: keychainKey)
        isSignedIn = false
        // Notify UI to prompt re-auth
        NotificationCenter.default.post(name: Notification.Name("sortify.auth.signedOut"), object: nil)
    }

    private func exchangeCodeForToken(code: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let codeVerifier = LocalPKCEStore.shared.getVerifier() else { completion(.failure(AuthError.missingVerifier)); return }

        let url = URL(string: "https://accounts.spotify.com/api/token")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        let body = [
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirectURI,
            "client_id": clientId,
            "code_verifier": codeVerifier
        ]
        req.httpBody = body.percentEncoded()
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
            defer { self?.server?.stop() }
            if let err = err { completion(.failure(err)); return }
            guard let data = data else { completion(.failure(AuthError.emptyResponse)); return }
            do {
                let decoder = JSONDecoder()
                let resp = try decoder.decode(TokenResponse.self, from: data)
                let token = Token(accessToken: resp.access_token, refreshToken: resp.refresh_token, expiresAt: Date().timeIntervalSince1970 + resp.expires_in, scope: resp.scope, tokenType: resp.token_type)
                try? self?.storeToken(token)
                DispatchQueue.main.async {
                    self?.token = token
                    self?.isSignedIn = true
                    completion(.success(()))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private func loadTokenFromKeychain() {
        do {
            if let t = try KeychainStore.loadToken(key: keychainKey) {
                self.token = t
                if t.expiresAt > Date().timeIntervalSince1970 { self.isSignedIn = true }
            }
        } catch {
            print("Keychain load error: \(error)")
        }
    }

    private func storeToken(_ t: Token) throws {
        try KeychainStore.saveToken(t, key: keychainKey)
    }

    private func refreshAccessToken(refreshToken: String) async throws -> Token {
        let url = URL(string: "https://accounts.spotify.com/api/token")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        let body = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": clientId
        ]
        req.httpBody = body.percentEncoded()
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

      let (data, resp) = try await URLSession.shared.data(for: req)
      guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw AuthError.invalidTokenResponse }
      let decoder = JSONDecoder()
      let respObj = try decoder.decode(TokenResponse.self, from: data)
      let token = Token(accessToken: respObj.access_token, refreshToken: respObj.refresh_token ?? refreshToken, expiresAt: Date().timeIntervalSince1970 + respObj.expires_in, scope: respObj.scope, tokenType: respObj.token_type)
      return token
    }
}

enum AuthError: Error {
    case invalidAuthURL
    case missingVerifier
    case emptyResponse
    case invalidTokenResponse
    case unauthenticated
}

private class PresentationProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = PresentationProvider()
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { ASPresentationAnchor() }
}

// MARK: - PKCE helpers
private class LocalPKCEStore {
    static let shared = LocalPKCEStore()
    private var verifier: String?
    func set(verifier: String) { self.verifier = verifier }
    func getVerifier() -> String? { verifier }
}

extension SpotifyAuth {
    static func generateCodeVerifier() -> String {
        let data = Data((0..<64).map { _ in UInt8.random(in: 0...255) })
        return data.base64URLEncodedString()
    }

    static func codeChallenge(from verifier: String) -> String {
        let data = Data(verifier.utf8)
        let digest = SHA256.hash(data: data)
        return Data(digest).base64URLEncodedString()
    }
}

// MARK: - tiny local HTTP server (very small, only for the auth callback)
final class SimpleLocalHTTPServer {
    private let port: UInt16
    private var listener: NWListener?
    private var onCode: ((Result<String, Error>) -> Void)?

    init(port: UInt16) { self.port = port }

    func start(completion: @escaping (Result<String, Error>) -> Void) {
        self.onCode = completion
        do {
            let params = NWParameters.tcp
            listener = try NWListener(using: params, on: NWEndpoint.Port(rawValue: port)!)
        } catch {
            completion(.failure(error))
            return
        }

        listener?.newConnectionHandler = { conn in
            conn.start(queue: .global())
            self.handleConnection(conn)
        }

        listener?.start(queue: .global())
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }

    private func handleConnection(_ conn: NWConnection) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 16_384) { data, _, isComplete, error in
            defer { conn.cancel() }
            guard let data = data, let request = String(data: data, encoding: .utf8) else { return }
            // Simple parse for GET /callback?code=...
            if let range = request.range(of: "GET ") {
                let rest = request[range.upperBound...]
                if let end = rest.firstIndex(of: " ") {
                    let path = String(rest[..<end])
                    if let comps = URLComponents(string: "http://localhost\(path)"), let queryItems = comps.queryItems {
                        if let code = queryItems.first(where: { $0.name == "code" })?.value {
                            // send a small HTML page back
                            let resp = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body><h3>Authentication received. You can close this window.</h3></body></html>"
                            conn.send(content: resp.data(using: .utf8), completion: .contentProcessed({ _ in }))
                            self.onCode?(.success(code))
                            return
                        }
                    }
                }
            }
            // if we get here, send 400
            let resp = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nBad Request"
            conn.send(content: resp.data(using: .utf8), completion: .contentProcessed({ _ in }))
            self.onCode?(.failure(AuthError.emptyResponse))
        }
    }
}

// MARK: - helpers
extension Data {
    func base64URLEncodedString() -> String {
        return self.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .trimmingCharacters(in: CharacterSet(charactersIn: "="))
    }
}

extension Dictionary where Key == String, Value == String {
    func percentEncoded() -> Data? {
        map { key, value in
            let k = key.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            let v = value.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            return "\(k)=\(v)"
        }
        .joined(separator: "&")
        .data(using: .utf8)
    }
}

extension CharacterSet {
    static let urlQueryValueAllowed: CharacterSet = {
        let generalDelimitersToEncode = ":#[]@"
        let subDelimitersToEncode = "!$&'()*+,;="

        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: generalDelimitersToEncode + subDelimitersToEncode)
        return allowed
    }()
}
