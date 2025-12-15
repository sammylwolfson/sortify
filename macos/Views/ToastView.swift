import SwiftUI

struct ToastView: View {
    @ObservedObject var manager = ToastManager.shared

    var body: some View {
        Group {
            if let msg = manager.currentMessage {
                Text(msg)
                    .padding(10)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding()
                    .transition(.move(edge: .top).combined(with: .opacity))
            } else {
                EmptyView()
            }
        }
        .animation(.easeInOut, value: manager.currentMessage)
    }
}
