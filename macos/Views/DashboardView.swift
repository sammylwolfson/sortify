import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient

    @State private var isRefreshing = false
    @State private var statusMessage: String? = nil

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Genres")) {
                    ForEach(client.genreGroups) { group in
                        GenreRow(group: group)
                    }
                }
            }
            .listStyle(SidebarListStyle())
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    HStack {
                        Button("Run Now") {
                            runNow()
                        }
                        Button("Refresh Playlists") {
                            if auth.isSignedIn { client.fetchPlaylists(auth: auth) { _ in } }
                        }
                        Button("Settings") {
                            // open settings
                        }
                    }
                }
            }
            .navigationTitle("Sortify")

            VStack(alignment: .leading, spacing: 8) {
                if client.isLoading || isRefreshing { ProgressView("Working...") }
                if let err = client.lastError { Text("Error: \(err.localizedDescription)").foregroundColor(.red) }
                if let status = statusMessage { Text(status) }
                // observe rate-limit notifications
                .onReceive(NotificationCenter.default.publisher(for: .spotifyRateLimited)) { n in
                    if let wait = n.object as? TimeInterval {
                        statusMessage = "Rate limited — retrying in \(Int(wait))s"
                        // show toast as well
                        ToastManager.shared.show(message: "Rate limited — retrying in \(Int(wait))s", duration: max(4.0, wait))
                        // start a simple countdown (background timer)
                        Task {
                            var remaining = Int(wait)
                            while remaining > 0 {
                                try await Task.sleep(nanoseconds: 1_000_000_000)
                                remaining -= 1
                                DispatchQueue.main.async { statusMessage = "Rate limited — retrying in \(remaining)s" }
                            }
                            DispatchQueue.main.async { statusMessage = nil }
                        }
                    }
                }
                Spacer()
            }
            .padding()
        }
    }

    private func runNow() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        isRefreshing = true
        // First fetch playlists so pickers can populate, then fetch liked songs and group
        client.fetchPlaylists(auth: auth) { _ in }
        client.fetchLikedSongsAndGroup(auth: auth) { res in
            DispatchQueue.main.async {
                switch res {
                case .success():
                    statusMessage = "Genres refreshed."
                case .failure(let err):
                    statusMessage = "Error: \(err.localizedDescription)"
                }
                isRefreshing = false
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
