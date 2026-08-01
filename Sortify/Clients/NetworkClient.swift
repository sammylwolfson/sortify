import Foundation

/// Centralized network client that consults SpotifyAuth for tokens, and handles 429/5xx retries with backoff.
final class NetworkClient {
    private let auth: SpotifyAuth
    private let maxRetries = 4

    init(auth: SpotifyAuth) {
        self.auth = auth
    }

    /// Sends a request and decodes a Decodable response type
    func send<T: Decodable>(_ url: URL, method: String = "GET", body: Data? = nil) async throws -> T {
        var attempt = 0
        while true {
            let accessToken = try await auth.getValidAccessToken()
            var req = URLRequest(url: url)
            req.httpMethod = method
            req.httpBody = body
            if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
            req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse {
                    switch http.statusCode {
                    case 200...299:
                        return try JSONDecoder().decode(T.self, from: data)
                    case 429:
                        var wait = pow(2.0, Double(min(attempt, 6)))
                        if let ra = http.value(forHTTPHeaderField: "Retry-After"), let raSec = Double(ra) { wait = raSec }
                        NotificationCenter.default.post(name: .spotifyRateLimited, object: wait)
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        try await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
                        continue
                    case 500...599:
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        let backoff = pow(2.0, Double(attempt))
                        try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                        continue
                    default:
                        throw ClientError.httpError(code: http.statusCode)
                    }
                } else {
                    return try JSONDecoder().decode(T.self, from: data)
                }
            } catch {
                attempt += 1
                if attempt > maxRetries { throw error }
                let backoff = pow(2.0, Double(attempt))
                try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                continue
            }
        }
    }

    /// Send raw request (for POSTs that return empty or non-decodable responses)
    func sendRaw(url: URL, method: String = "POST", body: Data? = nil) async throws -> (Data, URLResponse) {
        var attempt = 0
        while true {
            let accessToken = try await auth.getValidAccessToken()
            var req = URLRequest(url: url)
            req.httpMethod = method
            req.httpBody = body
            if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
            req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                if let http = resp as? HTTPURLResponse {
                    switch http.statusCode {
                    case 200...299:
                        return (data, resp)
                    case 429:
                        var wait = pow(2.0, Double(min(attempt, 6)))
                        if let ra = http.value(forHTTPHeaderField: "Retry-After"), let raSec = Double(ra) { wait = raSec }
                        NotificationCenter.default.post(name: .spotifyRateLimited, object: wait)
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        try await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
                        continue
                    case 500...599:
                        attempt += 1
                        if attempt > maxRetries { throw ClientError.httpError(code: http.statusCode) }
                        let backoff = pow(2.0, Double(attempt))
                        try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                        continue
                    default:
                        throw ClientError.httpError(code: http.statusCode)
                    }
                } else {
                    return (data, resp)
                }
            } catch {
                attempt += 1
                if attempt > maxRetries { throw error }
                let backoff = pow(2.0, Double(attempt))
                try await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
                continue
            }
        }
    }
}
