import Foundation

/// Centralized error types used across the Sortify app
enum ClientError: Error, LocalizedError, CustomStringConvertible {
    case notAuthenticated
    case unauthorized
    case invalidResponse
    case httpError(code: Int)
    case rateLimited(retryAfter: TimeInterval?)
    case underlying(Error)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "Not authenticated"
        case .unauthorized: return "Unauthorized"
        case .invalidResponse: return "Invalid response from server"
        case .httpError(let code): return "HTTP error \(code)"
        case .rateLimited(let retry): return "Rate limited (retry after \(retry.map { String(Int($0)) + "s" } ?? "unknown"))"
        case .underlying(let err): return err.localizedDescription
        }
    }

    var description: String { errorDescription ?? "ClientError" }
}
