import SwiftUI

struct SuggestionsOverview: View {
    @EnvironmentObject var client: SpotifyClient
    @State private var isExpanded = true

    var body: some View {
        let all = client.allSuggestions
        guard !all.isEmpty else { return AnyView(EmptyView()) }

        return AnyView(
            DisclosureGroup(isExpanded: $isExpanded) {
                VStack(alignment: .leading, spacing: 6) {
                    if client.createSuggestionCount > 0 {
                        Label(
                            "\(client.createSuggestionCount) new playlist\(client.createSuggestionCount == 1 ? "" : "s") recommended",
                            systemImage: "plus.circle"
                        )
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    if client.combineSuggestionCount > 0 {
                        Label(
                            "\(client.combineSuggestionCount) genre merge\(client.combineSuggestionCount == 1 ? "" : "s") recommended",
                            systemImage: "arrow.triangle.merge"
                        )
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }

                    Divider()

                    ForEach(all) { suggestion in
                        SuggestionRow(suggestion: suggestion)
                    }
                }
                .padding(.top, 4)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(.yellow)
                    Text("\(all.count) Suggestion\(all.count == 1 ? "" : "s")")
                        .font(.headline)
                }
            }
        )
    }
}

/// A single suggestion row inside the overview panel, with accept/dismiss actions.
private struct SuggestionRow: View {
    @EnvironmentObject var client: SpotifyClient
    let suggestion: Suggestion
    @State private var isWorking = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: iconName)
                .foregroundColor(.accentColor)
                .font(.caption)

            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.caption).lineLimit(1)
                Text(subtitle).font(.caption2).foregroundColor(.secondary).lineLimit(1)
            }

            Spacer()

            Button(action: { accept() }) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            }
            .buttonStyle(.plain)
            .disabled(isWorking)
            .help("Accept")

            Button(action: { client.dismissSuggestion(id: suggestion.id) }) {
                Image(systemName: "xmark.circle")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .help("Dismiss")
        }
        .padding(.vertical, 2)
    }

    private var iconName: String {
        switch suggestion {
        case .createPlaylist: return "plus.circle"
        case .combineGenres: return "arrow.triangle.merge"
        }
    }

    private var title: String {
        switch suggestion {
        case .createPlaylist(_, _, let name):
            return "Create \"\(name)\""
        case .combineGenres(let g1, let g2, _, _):
            return "Merge \"\(g1)\" + \"\(g2)\""
        }
    }

    private var subtitle: String {
        switch suggestion {
        case .createPlaylist(_, let count, _):
            return "\(count) tracks"
        case .combineGenres(_, _, _, let score):
            return "\(Int(score * 100))% similar"
        }
    }

    private func accept() {
        switch suggestion {
        case .createPlaylist(let genreName, _, let suggestedName):
            isWorking = true
            Task {
                do {
                    try await client.acceptCreatePlaylist(genreName: genreName, suggestedName: suggestedName)
                    ToastManager.shared.show(message: "Playlist \"\(suggestedName)\" created!")
                } catch {
                    ToastManager.shared.show(message: "Error: \(error.localizedDescription)")
                }
                isWorking = false
            }
        case .combineGenres(let g1, let g2, _, _):
            if let pid = client.playlists.first?.id {
                client.acceptCombineGenres(genre1: g1, genre2: g2, targetPlaylistId: pid)
                ToastManager.shared.show(message: "Genres merged!")
            }
        }
    }
}
