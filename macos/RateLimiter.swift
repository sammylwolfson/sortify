import Foundation

/// Very small exponential backoff retrier. For the skeleton we retry up to N times on transient failures.
final class RateLimiter {
    let maxRetries = 4
    let baseDelay: TimeInterval = 0.5

    func retry<T>(operation: @escaping () async throws -> T) async throws -> T {
        var attempt = 0
        while true {
            do {
                return try await operation()
            } catch {
                attempt += 1
                if attempt > maxRetries { throw error }
                let delay = baseDelay * pow(2.0, Double(attempt - 1))
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
    }
}
