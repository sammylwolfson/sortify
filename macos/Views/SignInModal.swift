import SwiftUI

struct SignInModal: View {
    @EnvironmentObject var auth: SpotifyAuth
    @Environment(\.presentationMode) private var presentationMode: Binding<PresentationMode>

    @State private var isWorking = false
    @State private var errorMessage: String? = nil

    var body: some View {
        VStack(spacing: 16) {
            Text("Session expired")
                .font(.title2)
            Text("Your session has expired. Please sign in again to continue.")
                .multilineTextAlignment(.center)
            if let err = errorMessage { Text(err).foregroundColor(.red).font(.caption) }
            HStack {
                Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
                .keyboardShortcut(.cancelAction)

                Spacer()

                Button(action: {
                    isWorking = true
                    auth.signIn { res in
                        DispatchQueue.main.async {
                            isWorking = false
                            switch res {
                            case .success():
                                presentationMode.wrappedValue.dismiss()
                            case .failure(let err):
                                errorMessage = "Sign in failed: \(err.localizedDescription)"
                            }
                        }
                    }
                }) {
                    if isWorking { ProgressView() } else { Text("Sign in") }
                }
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding()
        .frame(width: 420)
    }
}
