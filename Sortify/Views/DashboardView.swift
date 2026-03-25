import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient

    @State private var selectedTab: Tab = .genres

    enum Tab: String, CaseIterable {
        case genres = "Genres"
        case scanner = "Playlist Scanner"
        case sort = "Auto-Sort"
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab bar
                HStack(spacing: 0) {
                    ForEach(Tab.allCases, id: \.self) { tab in
                        Button(action: { selectedTab = tab }) {
                            VStack(spacing: 4) {
                                Image(systemName: iconForTab(tab))
                                Text(tab.rawValue)
                                    .font(.caption)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(selectedTab == tab ? Color.accentColor.opacity(0.1) : Color.clear)
                            .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)

                Divider()

                // Tab content
                switch selectedTab {
                case .genres:
                    GenresTabView()
                case .scanner:
                    PlaylistScannerView()
                case .sort:
                    SortView()
                }
            }
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
        }
    }

    private func iconForTab(_ tab: Tab) -> String {
        switch tab {
        case .genres: return "music.quarternote.3"
        case .scanner: return "magnifyingglass"
        case .sort: return "arrow.up.arrow.down"
        }
    }

    @MainActor
    private func refreshAllOnLaunch() {
        client.fetchPlaylists(auth: auth) { _ in }
    }
}

// MARK: - Genres Tab (original dashboard content)

private struct GenresTabView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient

    @State private var isRefreshing = false
    @State private var statusMessage: String? = nil
    @State private var lastRun: Date? = nil

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Organize your Liked Songs by genre and push them into playlists.").font(.subheadline)
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
                    HStack(spacing: 12) {
                        Picker("Group by", selection: $client.groupingMode) {
                            ForEach(GroupingMode.allCases) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 260)
                    }
                    if let last = lastRun {
                        Text("Last refreshed \(RelativeDateTimeFormatter().localizedString(for: last, relativeTo: Date()))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
            Section {
                SuggestionsOverview()
            }

            Section(header: Text("Genres")) {
                if client.genreGroups.isEmpty {
                    Text("No genres yet. Tap \u{201C}Fetch Liked Songs\u{201D} after signing in.")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(client.genreGroups) { group in
                        GenreRow(group: group)
                    }
                }
            }
        }
        .listStyle(SidebarListStyle())
        // observe rate-limit notifications
        .onReceive(NotificationCenter.default.publisher(for: .spotifyRateLimited)) { n in
            if let wait = n.object as? TimeInterval {
                statusMessage = "Rate limited \u{2014} retrying in \(Int(wait))s"
                ToastManager.shared.show(message: "Rate limited \u{2014} retrying in \(Int(wait))s", duration: max(4.0, wait))
                let waitSeconds = max(0, Int(wait))
                Task {
                    for remaining in stride(from: waitSeconds, through: 1, by: -1) {
                        try await Task.sleep(nanoseconds: 1_000_000_000)
                        DispatchQueue.main.async { statusMessage = "Rate limited \u{2014} retrying in \(remaining-1)s" }
                    }
                    DispatchQueue.main.async { statusMessage = nil }
                }
            }
        }
        .overlay(
            VStack(alignment: .leading) {
                if client.isLoading || isRefreshing { ProgressView("Working...") }
                if let err = client.lastError { Text("Error: \(err.localizedDescription)").foregroundColor(.red) }
                if let status = statusMessage { Text(status).font(.caption).foregroundColor(.secondary) }
            }
            .padding(), alignment: .bottom)
    }

    private func refreshPlaylists() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        client.fetchPlaylists(auth: auth) { result in
            if case .failure(let err) = result {
                statusMessage = "Playlist refresh failed: \(err.localizedDescription)"
            }
        }
    }

    private func runNow() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        isRefreshing = true
        Task {
            do {
                let _ = try await client.fetchPlaylistsAsync()
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
