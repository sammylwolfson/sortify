import SwiftUI

/// View for auto-sorting liked songs into playlists based on filter rules.
struct SortView: View {
    @EnvironmentObject var client: SpotifyClient
    @EnvironmentObject var auth: SpotifyAuth

    @State private var isRunning = false
    @State private var statusMessage: String? = nil
    @State private var showUnsortedOnly = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Auto-Sort Songs")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Match your liked songs to playlists based on your filter rules. Set up filters in the Playlist Scanner first.")
                .font(.subheadline)
                .foregroundColor(.secondary)

            if client.playlistFilters.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundColor(.orange)
                    Text("No playlist filters set up yet. Go to Playlist Scanner to analyze your playlists and create filters.")
                        .font(.subheadline)
                }
                .padding(10)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }

            Divider()

            HStack(spacing: 12) {
                Button(action: { runSort() }) {
                    Label("Sort Liked Songs", systemImage: "arrow.up.arrow.down")
                }
                .disabled(isRunning || client.playlistFilters.isEmpty || client.cachedTracksEmpty)

                Button(action: { executeSort() }) {
                    Label("Move to Playlists", systemImage: "arrow.right.circle.fill")
                }
                .disabled(isRunning || client.sortResults.isEmpty || sortedCount == 0)
                .help("Move matched songs to their playlists on Spotify")

                Toggle("Show unsorted only", isOn: $showUnsortedOnly)

                Spacer()

                if !client.sortResults.isEmpty {
                    Text("\(sortedCount) matched, \(unsortedCount) unsorted")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if isRunning { ProgressView("Working...") }
            if let status = statusMessage {
                Text(status).font(.caption).foregroundColor(.secondary)
            }

            // Results
            if !client.sortResults.isEmpty {
                List {
                    ForEach(displayedResults) { result in
                        SortResultRow(result: result)
                    }
                }
                .listStyle(.inset)
            }

            Spacer()
        }
        .padding()
    }

    private var displayedResults: [SortResult] {
        if showUnsortedOnly {
            return client.sortResults.filter { $0.isUnsorted }
        }
        return client.sortResults
    }

    private var sortedCount: Int {
        client.sortResults.filter { !$0.isUnsorted }.count
    }

    private var unsortedCount: Int {
        client.sortResults.filter { $0.isUnsorted }.count
    }

    private func runSort() {
        let results = client.routeLikedSongs()
        statusMessage = "Matched \(sortedCount) songs to playlists. \(unsortedCount) songs didn't match any filter."
        _ = results  // suppress unused warning
    }

    private func executeSort() {
        let matched = client.sortResults.filter { !$0.isUnsorted }
        guard !matched.isEmpty else { return }
        isRunning = true
        statusMessage = "Moving songs to playlists..."
        Task {
            do {
                let count = try await client.executeSortResults(auth: auth, results: matched) { completed, total in
                    DispatchQueue.main.async {
                        statusMessage = "Moving to playlist \(completed)/\(total)..."
                    }
                }
                statusMessage = "Done! Moved \(count) songs to playlists."
                ToastManager.shared.show(message: "Moved \(count) songs to playlists!")
            } catch {
                statusMessage = "Error: \(error.localizedDescription)"
            }
            isRunning = false
        }
    }
}

// MARK: - Sort Result Row

private struct SortResultRow: View {
    let result: SortResult

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(result.track.name)
                    .font(.subheadline)
                    .lineLimit(1)
                Text(result.track.artistNames.joined(separator: ", "))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            if result.isUnsorted {
                Text("No match")
                    .font(.caption)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(4)
            } else {
                VStack(alignment: .trailing, spacing: 1) {
                    ForEach(result.matchedPlaylists.prefix(2), id: \.playlist.id) { match in
                        Text(match.playlist.name)
                            .font(.caption)
                            .foregroundColor(.green)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(4)
                    }
                    if result.matchedPlaylists.count > 2 {
                        Text("+\(result.matchedPlaylists.count - 2) more")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }
}
