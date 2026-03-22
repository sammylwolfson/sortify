import SwiftUI

struct GenreRow: View {
    @EnvironmentObject var client: SpotifyClient
    @EnvironmentObject var auth: SpotifyAuth

    var group: GenreGroup
    @State private var selectedPlaylistId: String? = nil
    @State private var isWorking = false
    @State private var progressMessage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                VStack(alignment: .leading) {
                    Text(group.name).font(.headline)
                    Text("\(group.tracks.count) tracks").font(.subheadline)
                }
                Spacer()
                Picker(selection: $selectedPlaylistId, label: Text("Playlist")) {
                    Text("Select").tag(String?.none)
                    ForEach(client.playlists) { pl in
                        Text(pl.name).tag(Optional(pl.id))
                    }
                }
                .frame(width: 220)

                // Persist mapping when selection changes
                .onChange(of: selectedPlaylistId) { newId in
                    client.setMapping(genre: group.name, playlistId: newId)
                }

                Button("Add All to Playlist") {
                    Task {
                        await addAll()
                    }
                }
                .disabled(isWorking || selectedPlaylistId == nil)
            }

            // Inline suggestion badges
            if let groupSuggestions = client.suggestions[group.name], !groupSuggestions.isEmpty {
                HStack(spacing: 6) {
                    ForEach(groupSuggestions) { suggestion in
                        SuggestionBadge(
                            suggestion: suggestion,
                            onAccept: { handleAccept(suggestion) },
                            onDismiss: { client.dismissSuggestion(id: suggestion.id) }
                        )
                    }
                }
            }
        }
        .padding(.vertical, 6)
        .onAppear {
            // default selection can be set here
            if selectedPlaylistId == nil {
                selectedPlaylistId = group.mappedPlaylistId ?? client.playlists.first?.id
            }
        }
        .overlay(
            VStack(alignment: .leading) {
                if let msg = progressMessage {
                    Text(msg).font(.caption).foregroundColor(.gray)
                }
            }
            .padding(.leading, 8), alignment: .bottomLeading)
    }

    private func handleAccept(_ suggestion: Suggestion) {
        switch suggestion {
        case .createPlaylist(let genreName, _, let suggestedName):
            isWorking = true
            progressMessage = "Creating playlist..."
            Task {
                do {
                    try await client.acceptCreatePlaylist(genreName: genreName, suggestedName: suggestedName)
                    progressMessage = "Playlist \"\(suggestedName)\" created!"
                } catch {
                    progressMessage = "Error: \(error.localizedDescription)"
                }
                isWorking = false
            }
        case .combineGenres(let g1, let g2, _, _):
            // Map both genres to the currently selected playlist, or the first available
            if let pid = selectedPlaylistId ?? client.playlists.first?.id {
                client.acceptCombineGenres(genre1: g1, genre2: g2, targetPlaylistId: pid)
                progressMessage = "Genres combined!"
            }
        }
    }

    private func addAll() async {
        guard let pid = selectedPlaylistId else { return }
        isWorking = true
        let uris = group.tracks.map { $0.uri }
        do {
            try await client.addTracksToPlaylist(auth: auth, playlistId: pid, uris: uris) { completed, total in
                DispatchQueue.main.async {
                    progressMessage = "Adding chunk \(completed)/\(total)..."
                }
            }
            DispatchQueue.main.async {
                progressMessage = "Added \(uris.count) tracks to playlist"
            }
        } catch {
            DispatchQueue.main.async {
                progressMessage = "Error: \(error.localizedDescription)"
            }
        }
        isWorking = false
    }
}

struct GenreRow_Previews: PreviewProvider {
    static var previews: some View {
        GenreRow(group: GenreGroup(name: "Rock", tracks: [], mappedPlaylistId: nil))
            .environmentObject(SpotifyClient())
            .environmentObject(SpotifyAuth())
            .padding()
    }
}
