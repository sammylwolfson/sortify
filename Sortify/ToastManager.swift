import Foundation
import Combine

/// ToastManager implements a simple FIFO queue for transient messages. New messages are enqueued and displayed one at a time.
final class ToastManager: ObservableObject {
    static let shared = ToastManager()
    @Published private(set) var currentMessage: String? = nil

    private var queue: [String] = []
    private var isShowing = false
    private var lock = NSLock()

    private init() {}

    /// Enqueue a message. duration is how long to show each message.
    func show(message: String, duration: TimeInterval = 4.0) {
        lock.lock(); defer { lock.unlock() }
        queue.append(message)
        if !isShowing {
            showNext(duration: duration)
        }
    }

    private func showNext(duration: TimeInterval) {
        lock.lock()
        guard !queue.isEmpty else { isShowing = false; lock.unlock(); return }
        isShowing = true
        let msg = queue.removeFirst()
        lock.unlock()

        DispatchQueue.main.async {
            self.currentMessage = msg
        }

        Task {
            try await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            DispatchQueue.main.async {
                self.currentMessage = nil
            }
            // small delay between toasts
            try? await Task.sleep(nanoseconds: 250_000_000)
            self.showNext(duration: duration)
        }
    }
}
