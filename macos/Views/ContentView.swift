import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient
    @State private var showSignInModal: Bool = false

    var body: some View {
        Group {
            if auth.isSignedIn {
                DashboardView()
            } else {
                VStack(spacing: 16) {
                    Text("Sortify — native macOS")
                        .font(.title)
                    Button("Sign in with Spotify") {
                        auth.signIn { res in
                            switch res {
                            case .success():
                                print("Signed in")
                            case .failure(let err):
                                print("Sign in error: \(err)")
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .frame(minWidth: 700, minHeight: 480)
        .overlay(
            VStack { Spacer(); ToastView() }
        )
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("sortify.auth.signedOut"))) { _ in
            ToastManager.shared.show(message: "Session expired — please sign in again.")
        }
        .sheet(isPresented: $showSignInModal) {
            SignInModal()
                .environmentObject(auth)
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("sortify.auth.signedOut"))) { _ in
            // open the modal after toast
            showSignInModal = true
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(SpotifyAuth())
            .environmentObject(SpotifyClient())
    }
}
