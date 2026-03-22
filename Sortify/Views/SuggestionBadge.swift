import SwiftUI

struct SuggestionBadge: View {
    let suggestion: Suggestion
    let onAccept: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: iconName)
                .foregroundColor(.accentColor)
                .font(.caption)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(1)
            Button(action: onAccept) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.caption)
            }
            .buttonStyle(.plain)
            .help("Accept suggestion")
            Button(action: onDismiss) {
                Image(systemName: "xmark.circle")
                    .foregroundColor(.secondary)
                    .font(.caption)
            }
            .buttonStyle(.plain)
            .help("Dismiss suggestion")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(Color.accentColor.opacity(0.08))
        .cornerRadius(6)
    }

    private var iconName: String {
        switch suggestion {
        case .createPlaylist: return "plus.circle"
        case .combineGenres: return "arrow.triangle.merge"
        }
    }

    private var label: String {
        switch suggestion {
        case .createPlaylist(_, let count, let name):
            return "Create \"\(name)\"? (\(count) tracks)"
        case .combineGenres(_, let genre2, _, _):
            return "Combine with \"\(genre2)\"?"
        }
    }
}
