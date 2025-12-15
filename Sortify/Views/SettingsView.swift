import SwiftUI

struct SettingsView: View {
    @State private var clientId: String = "SPOTIFY_CLIENT_ID_PLACEHOLDER"

    var body: some View {
        Form {
            Section(header: Text("Spotify")) {
                TextField("Client ID", text: $clientId)
                Text("For native apps use Authorization Code with PKCE. Do NOT embed a client secret.")
                    .font(.footnote)
            }
            Section(header: Text("Local")) {
                Text("Cached data is stored in Application Support/Sortify.")
            }
        }
        .padding()
        .frame(width: 480)
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}
