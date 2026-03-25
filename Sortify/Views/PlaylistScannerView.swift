import SwiftUI

/// View for scanning personal playlists, viewing their genre breakdown,
/// and accepting recommended filter settings.
struct PlaylistScannerView: View {
    @EnvironmentObject var client: SpotifyClient
    @EnvironmentObject var auth: SpotifyAuth

    @State private var selectedPlaylistId: String? = nil
    @State private var isScanning = false
    @State private var scanResult: FilterRecommendation? = nil
    @State private var statusMessage: String? = nil
    @State private var isAnalyzingAll = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            Text("Playlist Scanner")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Scan your playlists to analyze their contents and set up filter rules for auto-sorting.")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Divider()

            // Playlist picker + scan button
            HStack(spacing: 12) {
                Picker("Playlist", selection: $selectedPlaylistId) {
                    Text("Select a playlist...").tag(String?.none)
                    ForEach(client.playlists) { pl in
                        Text(pl.name).tag(Optional(pl.id))
                    }
                }
                .frame(width: 280)

                Button(action: { scanSelected() }) {
                    Label("Scan", systemImage: "magnifyingglass")
                }
                .disabled(selectedPlaylistId == nil || isScanning)

                Button(action: { analyzeAll() }) {
                    Label("Analyze All Playlists", systemImage: "wand.and.stars")
                }
                .disabled(isAnalyzingAll || client.playlists.isEmpty)
            }

            if isScanning || isAnalyzingAll {
                ProgressView(isAnalyzingAll ? "Analyzing playlists..." : "Scanning playlist...")
            }

            if let status = statusMessage {
                Text(status).font(.caption).foregroundColor(.secondary)
            }

            // Scan result for selected playlist
            if let rec = scanResult {
                RecommendationCard(recommendation: rec, onAccept: { acceptRecommendation(rec) })
            }

            Divider()

            // All recommendations from bulk analysis
            if !client.filterRecommendations.isEmpty {
                Text("Recommendations")
                    .font(.headline)
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(client.filterRecommendations) { rec in
                            RecommendationCard(recommendation: rec, onAccept: { acceptRecommendation(rec) })
                        }
                    }
                }
            }

            // Current filters
            if !client.playlistFilters.isEmpty {
                Divider()
                Text("Active Filters")
                    .font(.headline)
                ForEach(client.playlistFilters) { filter in
                    ActiveFilterRow(filter: filter)
                }
            }

            Spacer()
        }
        .padding()
    }

    private func scanSelected() {
        guard let pid = selectedPlaylistId,
              let playlist = client.playlists.first(where: { $0.id == pid })
        else { return }
        isScanning = true
        scanResult = nil
        statusMessage = "Scanning \(playlist.name)..."
        Task {
            do {
                let rec = try await client.analyzePlaylist(playlistId: pid, playlistName: playlist.name)
                scanResult = rec
                statusMessage = "Scan complete. \(rec.topGenres.count) genres found."
            } catch {
                statusMessage = "Error: \(error.localizedDescription)"
            }
            isScanning = false
        }
    }

    private func analyzeAll() {
        isAnalyzingAll = true
        statusMessage = "Analyzing all playlists..."
        Task {
            do {
                let recs = try await client.analyzeAllPlaylists()
                statusMessage = "Done! \(recs.count) playlist\(recs.count == 1 ? "" : "s") with recommendations."
            } catch {
                statusMessage = "Error: \(error.localizedDescription)"
            }
            isAnalyzingAll = false
        }
    }

    private func acceptRecommendation(_ rec: FilterRecommendation) {
        client.saveFilter(rec.suggestedFilter)
        // Remove from recommendations
        client.filterRecommendations.removeAll { $0.playlistId == rec.playlistId }
        if scanResult?.playlistId == rec.playlistId { scanResult = nil }
        ToastManager.shared.show(message: "Filter saved for \"\(rec.playlistName)\"")
    }
}

// MARK: - Recommendation Card

private struct RecommendationCard: View {
    let recommendation: FilterRecommendation
    let onAccept: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "music.note.list")
                    .foregroundColor(.accentColor)
                Text(recommendation.playlistName)
                    .font(.headline)
                Spacer()
                Button(action: onAccept) {
                    Label("Apply Filter", systemImage: "checkmark.circle.fill")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }

            // Top genres
            if !recommendation.topGenres.isEmpty {
                Text("Top genres:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                FlowLayout(spacing: 4) {
                    ForEach(recommendation.topGenres.prefix(8), id: \.genre) { item in
                        GenreChip(
                            name: item.genre,
                            percentage: item.percentage,
                            isIncluded: recommendation.suggestedFilter.genres.contains(item.genre)
                        )
                    }
                }
            }

            // Top decades
            if !recommendation.topDecades.isEmpty {
                Text("Decades:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                HStack(spacing: 4) {
                    ForEach(recommendation.topDecades.prefix(4), id: \.decade) { item in
                        Text("\(item.decade) (\(Int(item.percentage))%)")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                recommendation.suggestedFilter.decades.contains(item.decade)
                                    ? Color.blue.opacity(0.15)
                                    : Color.gray.opacity(0.1)
                            )
                            .cornerRadius(4)
                    }
                }
            }

            // Suggested match mode
            HStack(spacing: 4) {
                Text("Suggested mode:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(recommendation.suggestedFilter.matchMode.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
            }
        }
        .padding(10)
        .background(Color.accentColor.opacity(0.05))
        .cornerRadius(8)
    }
}

// MARK: - Genre Chip

private struct GenreChip: View {
    let name: String
    let percentage: Double
    let isIncluded: Bool

    var body: some View {
        Text("\(name) (\(Int(percentage))%)")
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(isIncluded ? Color.green.opacity(0.15) : Color.gray.opacity(0.1))
            .cornerRadius(4)
    }
}

// MARK: - Active Filter Row

private struct ActiveFilterRow: View {
    @EnvironmentObject var client: SpotifyClient
    let filter: PlaylistFilter

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(filter.playlistName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text("\(filter.genres.count) genres, \(filter.decades.count) decades — \(filter.matchMode.rawValue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Button(action: { client.removeFilter(playlistId: filter.playlistId) }) {
                Image(systemName: "trash")
                    .foregroundColor(.red)
            }
            .buttonStyle(.plain)
            .help("Remove filter")
        }
        .padding(.vertical, 4)
    }
}

// MARK: - FlowLayout (simple horizontal wrapping)

private struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX, height: y + rowHeight), positions)
    }
}
