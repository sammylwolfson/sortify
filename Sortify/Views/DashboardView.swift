import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient

    @State private var isRefreshing = false
    @State private var statusMessage: String? = nil
    @State private var lastRun: Date? = nil

    var body: some View {
        NavigationView {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Free tier: organize your Liked Songs by genre and push them into playlists.").font(.subheadline)
                        HStack(spacing: 12) {
                            Button(action: { runNow() }) {
                                Label("Fetch Liked Songs", systemImage: "arrow.triangle.2.circlepath")
                            }
                            .disabled(isRefreshing || !auth.isSignedIn)

                            Button(action: { refreshPlaylists() }) {
                                Label("Refresh Playlists", systemImage: "music.note.list")
                            }
                            .disabled(!auth.isSignedIn)
                        }
                        if let last = lastRun {
                            Text("Last refreshed \(RelativeDateTimeFormatter().localizedString(for: last, relativeTo: Date()))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                Section(header: Text("Genres")) {
                    if client.genreGroups.isEmpty {
                        Text("No genres yet. Tap “Fetch Liked Songs” after signing in.")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(client.genreGroups) { group in
                            GenreRow(group: group)
                        }
                    }
                }
            }
            .listStyle(SidebarListStyle())
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { auth.signOut() }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Sortify")
            .onAppear {
                if auth.isSignedIn {
                    Task { refreshAllOnLaunch() }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                if client.isLoading || isRefreshing { ProgressView("Working...") }
                if let err = client.lastError { Text("Error: \(err.localizedDescription)").foregroundColor(.red) }
                if let status = statusMessage { Text(status) }
                Spacer()
            }
            .padding()
            // observe rate-limit notifications
            .onReceive(NotificationCenter.default.publisher(for: .spotifyRateLimited)) { n in
                if let wait = n.object as? TimeInterval {
                    statusMessage = "Rate limited — retrying in \(Int(wait))s"
                    ToastManager.shared.show(message: "Rate limited — retrying in \(Int(wait))s", duration: max(4.0, wait))
                    let waitSeconds = max(0, Int(wait))
                    Task {
                        for remaining in stride(from: waitSeconds, through: 1, by: -1) {
                            try await Task.sleep(nanoseconds: 1_000_000_000)
                            DispatchQueue.main.async { statusMessage = "Rate limited — retrying in \(remaining-1)s" }
                        }
                        DispatchQueue.main.async { statusMessage = nil }
                    }
                }
            }
        }
    }

    private func refreshPlaylists() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        client.fetchPlaylists(auth: auth) { result in
            if case .failure(let err) = result {
                statusMessage = "Playlist refresh failed: \(err.localizedDescription)"
            }
        }
    }

    @MainActor
    private func refreshAllOnLaunch() {
        refreshPlaylists()
        runNow()
    }

    private func runNow() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        isRefreshing = true
        Task {
            do {
                // fetch playlists
                let _ = try await client.fetchPlaylistsAsync()
                // fetch liked songs & group
                let groups = try await client.fetchLikedSongsAndGroupAsync()
                DispatchQueue.main.async {
                    client.genreGroups = groups
                    statusMessage = "Genres refreshed."
                    isRefreshing = false
                    lastRun = Date()
                }
            } catch {
                DispatchQueue.main.async {
                    statusMessage = "Error: \(error.localizedDescription)"
                    isRefreshing = false
                }
            }
        }
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(SpotifyAuth())
            .environmentObject(SpotifyClient())
    }
}
