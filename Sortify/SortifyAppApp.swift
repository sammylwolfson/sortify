import SwiftUI

@main
struct SortifyAppApp: App {
    @StateObject private var auth = SpotifyAuth()
    @StateObject private var client = SpotifyClient()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(client)
                .onAppear {
                    // wire auth into client so client can refresh tokens when needed
                    client.auth = auth
                    // configure network client with auth
                    client.configureNetwork(with: auth)
                    // load persisted playlist mapping
                    client.loadPlaylistMapping()
                }
        }
    }
}
