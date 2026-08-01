import SwiftUI
import Combine

struct DashboardView: View {
    @EnvironmentObject var auth: SpotifyAuth
    @EnvironmentObject var client: SpotifyClient

    @State private var isRefreshing = false
    @State private var statusMessage: String? = nil
    @State private var lastRun: Date? = nil
    @State private var sourceSelection: String = "liked"
    @State private var runTask: Task<Void, Never>? = nil
    @State private var sourceTask: Task<Void, Never>? = nil
    @State private var sourceTracks: [Track] = []
    @State private var isLoadingSource = false
    @State private var trackSortBy: TrackSortBy = .title
    @State private var trackFeatures: [String: AudioFeatures] = [:]
    @State private var isLoadingFeatures = false
    @State private var sortOrder: [KeyPathComparator<Track>] = []
    @State private var workStart: Date? = nil
    @State private var elapsedSeconds: Int = 0
    @State private var remainingSeconds: Int? = nil
    @State private var progressCompleted: Int = 0
    @State private var progressTotal: Int = 0
    @State private var isGenreSettingsPresented = false
    @State private var selectedPlaylistId: String = ""

    var body: some View {
        NavigationSplitView {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Sortify")
                            .font(.largeTitle.weight(.semibold))
                        Text("Pick a playlist, group its songs by genre, then push each genre into a playlist you choose.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Source playlist").font(.caption).foregroundColor(.secondary)
                            Picker("Source", selection: $sourceSelection) {
                                Text("Liked Songs").tag("liked")
                                ForEach(client.playlists) { pl in
                                    Text(pl.name).tag(pl.id)
                                }
                            }
                            .labelsHidden()
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Button(action: { refreshPlaylists() }) {
                                Label("Refresh Playlists", systemImage: "music.note.list")
                            }
                            .disabled(!auth.isSignedIn || isRefreshing)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if let last = lastRun {
                            Text("Last run \(RelativeDateTimeFormatter().localizedString(for: last, relativeTo: Date()))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                Section {
                    playlistsHeaderRow()
                    if client.playlists.isEmpty {
                        Text("No playlists yet. Sign in and tap “Refresh Playlists.”")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(client.playlists) { pl in
                            HStack(spacing: 10) {
                                Image(systemName: "music.note.list")
                                    .foregroundColor(.secondary)
                                Text(pl.name)
                                    .lineLimit(1)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .listStyle(.sidebar)
            .frame(minWidth: 260, idealWidth: 260, maxWidth: 260)
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
                    refreshPlaylists()
                    loadSourceTracks()
                }
            }
            .onChange(of: sourceSelection) { _ in
                loadSourceTracks()
            }
            .onReceive(NotificationCenter.default.publisher(for: Notification.Name("sortify.auth.signedOut"))) { _ in
                sourceTracks = []
                isLoadingSource = false
                trackFeatures = [:]
            }
        } detail: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text(sourceTitle())
                        .font(.title2.weight(.semibold))
                    Spacer()
                    Picker("Sort By", selection: $trackSortBy) {
                        ForEach(TrackSortBy.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .labelsHidden()
                    .frame(width: 180)
                    Button(action: { cancelRun() }) {
                        Image(systemName: "xmark")
                    }
                    .disabled(!isRefreshing)
                    .buttonStyle(.bordered)
                    .tint(.red)
                    Button(action: { runNow() }) {
                        Label("Sortify", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(isRefreshing || !auth.isSignedIn)
                    .buttonStyle(.borderedProminent)
                }
                if isRefreshing || isLoadingSource {
                    ProgressView()
                        .progressViewStyle(.linear)
                }
                if isLoadingFeatures {
                    ProgressView("Loading audio features...")
                }
                if isRefreshing, let remaining = remainingSeconds {
                    Text("Working… \(elapsedSeconds)s elapsed · ~\(remaining)s remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else if isRefreshing, workStart != nil {
                    Text("Working… \(elapsedSeconds)s elapsed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if !sourceTracks.isEmpty {
                    Text("\(sourceTracks.count) songs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if !sourceTracks.isEmpty {
                    PlaylistStatsSheetView(stats: playlistStats)
                }

                if isLoadingSource {
                    ProgressView("Loading songs...")
                } else if sourceTracks.isEmpty {
                    Text("No tracks loaded yet. Select a source playlist above.")
                        .foregroundColor(.secondary)
                } else {
                    Table(sortedTracks, sortOrder: $sortOrder) {
                        TableColumn("Title", value: \.name) { track in
                            Text(track.name)
                                .lineLimit(1)
                        }
                        .width(min: 220, ideal: 260)
                        TableColumn("Artist", value: \.primaryArtist) { track in
                            Text(track.artistNames.joined(separator: ", "))
                                .lineLimit(1)
                        }
                        .width(min: 180, ideal: 220)
                        TableColumn("Album", value: \.albumSortName) { track in
                            Text(track.albumName ?? "")
                                .lineLimit(1)
                        }
                        .width(min: 160, ideal: 220)
                        TableColumn("Genres", value: \.primaryGenre) { track in
                            Text(track.genres.joined(separator: ", "))
                                .lineLimit(2)
                        }
                        .width(min: 220, ideal: 320)
                    }
                    .frame(maxHeight: .infinity)
                }

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
            .onChange(of: trackSortBy) { _ in
                if requiresTrackFeatures() {
                    sortOrder = []
                }
                ensureTrackFeaturesIfNeeded()
            }
            .onChange(of: sortOrder) { _ in
                if !sortOrder.isEmpty {
                    trackSortBy = .title
                }
            }
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                guard let start = workStart, isRefreshing else { return }
                elapsedSeconds = max(0, Int(Date().timeIntervalSince(start)))
                if progressTotal > 0, progressCompleted > 0 {
                    let fraction = Double(progressCompleted) / Double(progressTotal)
                    if fraction > 0 {
                        let estTotal = Double(elapsedSeconds) / fraction
                        let remaining = max(0, Int(estTotal.rounded(.up)) - elapsedSeconds)
                        remainingSeconds = remaining
                    }
                }
            }
        }
        .sheet(isPresented: $isGenreSettingsPresented) {
            PlaylistGenreSettingsView(
                selectedPlaylistId: $selectedPlaylistId,
                isPresented: $isGenreSettingsPresented
            )
            .environmentObject(client)
        }
    }

    private func refreshPlaylists() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        client.fetchPlaylists(auth: auth) { result in
            if case .failure(let err) = result {
                statusMessage = "Playlist refresh failed: \(err.localizedDescription)"
            } else {
                loadSourceTracks()
            }
        }
    }

    private func runNow() {
        guard auth.isSignedIn else { statusMessage = "Sign in first."; return }
        isRefreshing = true
        statusMessage = "Sorting..."
        workStart = Date()
        elapsedSeconds = 0
        remainingSeconds = nil
        progressCompleted = 0
        progressTotal = 0

        let source: SpotifyClient.TrackSource = sourceSelection == "liked"
            ? .likedSongs
            : .playlist(id: sourceSelection)

        runTask?.cancel()
        runTask = Task {
            do {
                // fetch playlists
                let _ = try await client.fetchPlaylistsAsync()
                // fetch liked songs & group
                let (groups, tracks) = try await client.fetchTracksAndGroupAsync(source: source, sortBy: groupingSortBy())
                // apply playlist genre filters
                try await applyGenreFilters(tracks: tracks, source: source)
                DispatchQueue.main.async {
                    client.genreGroups = groups
                    sourceTracks = tracks
                    statusMessage = "Genres refreshed."
                    isRefreshing = false
                    workStart = nil
                    remainingSeconds = nil
                    lastRun = Date()
                }
            } catch {
                DispatchQueue.main.async {
                    if (error as? CancellationError) != nil {
                        statusMessage = "Canceled."
                    } else {
                        statusMessage = "Error: \(error.localizedDescription)"
                    }
                    isRefreshing = false
                    workStart = nil
                    remainingSeconds = nil
                }
            }
        }
    }

    private func cancelRun() {
        runTask?.cancel()
        runTask = nil
        isRefreshing = false
        statusMessage = "Canceled."
        workStart = nil
        remainingSeconds = nil
    }

    private func sourceTitle() -> String {
        if sourceSelection == "liked" {
            return "Liked Songs"
        }
        if let match = client.playlists.first(where: { $0.id == sourceSelection }) {
            return match.name
        }
        return "Playlist"
    }

    private func loadSourceTracks() {
        guard auth.isSignedIn else { return }
        isLoadingSource = true
        statusMessage = "Loading tracks..."
        let source: SpotifyClient.TrackSource = sourceSelection == "liked"
            ? .likedSongs
            : .playlist(id: sourceSelection)

        sourceTask?.cancel()
        sourceTask = Task {
            do {
                let tracks = try await client.fetchTracksAsync(source: source)
                DispatchQueue.main.async {
                    sourceTracks = tracks
                    isLoadingSource = false
                    statusMessage = nil
                    ensureTrackFeaturesIfNeeded()
                }
            } catch {
                DispatchQueue.main.async {
                    if (error as? CancellationError) == nil {
                        statusMessage = "Track load failed: \(error.localizedDescription)"
                    }
                    isLoadingSource = false
                }
            }
        }
    }

    private var sortedTracks: [Track] {
        if !sortOrder.isEmpty {
            return sourceTracks.sorted(using: sortOrder)
        }
        return sortTracks(sourceTracks)
    }

    private var playlistStats: PlaylistStats {
        let totalTracks = sourceTracks.count
        let uniqueArtists = Set(sourceTracks.flatMap { $0.artistNames }).count
        let uniqueAlbums = Set(sourceTracks.compactMap { $0.albumName }).count

        var distribution: [String: Int] = [:]
        for track in sourceTracks {
            let parent = primaryParentGenre(for: track.genres)
            distribution[parent, default: 0] += 1
        }

        let topGenres = distribution
            .map { PlaylistStats.GenreCount(name: $0.key, count: $0.value) }
            .sorted {
                if $0.count == $1.count { return $0.name < $1.name }
                return $0.count > $1.count
            }
            .prefix(8)

        let loadedFeatures = sourceTracks.compactMap { trackFeatures[$0.id] }
        let avgBPM = loadedFeatures.isEmpty ? nil : loadedFeatures.map { $0.tempo }.reduce(0, +) / Double(loadedFeatures.count)
        let avgEnergy = loadedFeatures.isEmpty ? nil : loadedFeatures.map { $0.energy }.reduce(0, +) / Double(loadedFeatures.count)
        let avgDanceability = loadedFeatures.isEmpty ? nil : loadedFeatures.map { $0.danceability }.reduce(0, +) / Double(loadedFeatures.count)

        return PlaylistStats(
            totalTracks: totalTracks,
            uniqueArtists: uniqueArtists,
            uniqueAlbums: uniqueAlbums,
            topGenres: Array(topGenres),
            avgBPM: avgBPM,
            avgEnergy: avgEnergy,
            avgDanceability: avgDanceability
        )
    }

    private func primaryParentGenre(for genres: [String]) -> String {
        for genre in genres {
            let mapped = mapGenreToParent(genre)
            if mapped != "Other" {
                return mapped
            }
        }
        return "Other"
    }

    private func sortTracks(_ tracks: [Track]) -> [Track] {
        switch trackSortBy {
        case .title:
            return tracks.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .artist:
            return tracks.sorted { ($0.artistNames.first ?? "").localizedCaseInsensitiveCompare($1.artistNames.first ?? "") == .orderedAscending }
        case .album:
            return tracks.sorted { ($0.albumName ?? "").localizedCaseInsensitiveCompare($1.albumName ?? "") == .orderedAscending }
        case .genre:
            return tracks.sorted { ($0.genres.first ?? "").localizedCaseInsensitiveCompare($1.genres.first ?? "") == .orderedAscending }
        case .bpm:
            return sortByFeature(tracks, value: { $0.tempo })
        case .energy:
            return sortByFeature(tracks, value: { $0.energy })
        case .danceability:
            return sortByFeature(tracks, value: { $0.danceability })
        case .valence:
            return sortByFeature(tracks, value: { $0.valence })
        }
    }

    private func sortByFeature(_ tracks: [Track], value: (AudioFeatures) -> Double) -> [Track] {
        return tracks.sorted { a, b in
            let va = trackFeatures[a.id].map(value)
            let vb = trackFeatures[b.id].map(value)
            switch (va, vb) {
            case let (l?, r?):
                return l < r
            case (nil, nil):
                return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            case (nil, _?):
                return false
            case (_?, nil):
                return true
            }
        }
    }

    private func requiresTrackFeatures() -> Bool {
        switch trackSortBy {
        case .bpm, .energy, .danceability, .valence:
            return true
        case .title, .artist, .album, .genre:
            return false
        }
    }

    private func ensureTrackFeaturesIfNeeded() {
        guard auth.isSignedIn else { return }
        guard requiresTrackFeatures() else {
            trackFeatures = [:]
            isLoadingFeatures = false
            return
        }
        let ids = sourceTracks.map { $0.id }
        if ids.isEmpty { return }
        isLoadingFeatures = true
        Task {
            do {
                let features = try await client.fetchAudioFeaturesForTracks(ids: ids)
                DispatchQueue.main.async {
                    self.trackFeatures = features
                    self.isLoadingFeatures = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.isLoadingFeatures = false
                    self.statusMessage = "Audio features load failed: \(error.localizedDescription)"
                }
            }
        }
    }

    private func groupingSortBy() -> SortBy {
        switch trackSortBy {
        case .bpm:
            return .bpm
        case .energy:
            return .energy
        case .danceability:
            return .danceability
        case .valence:
            return .valence
        case .title, .artist, .album, .genre:
            return .genre
        }
    }

    private func applyGenreFilters(tracks: [Track], source: SpotifyClient.TrackSource) async throws {
        let filters = client.playlistGenreFilters
        if filters.isEmpty { return }

        let totalChunks = calculateTotalChunks(tracks: tracks, filters: filters, source: source)
        DispatchQueue.main.async {
            progressTotal = totalChunks
            progressCompleted = 0
        }

        var movedTrackIds = Set<String>()
        for (playlistId, genres) in filters {
            if genres.isEmpty { continue }
            let selected = Set(genres)
            let matching = tracks.filter { track in
                !selected.isDisjoint(with: track.genres)
            }
            if matching.isEmpty { continue }

            let uris = matching.map { $0.uri }
            movedTrackIds.formUnion(matching.map { $0.id })
            DispatchQueue.main.async {
                statusMessage = "Moving \(uris.count) songs to playlist..."
            }
            var lastCompleted = 0
            try await client.addTracksToPlaylist(auth: auth, playlistId: playlistId, uris: uris) { completed, _ in
                let delta = max(0, completed - lastCompleted)
                lastCompleted = completed
                DispatchQueue.main.async {
                    progressCompleted += delta
                }
            }
        }

        if case .likedSongs = source, !movedTrackIds.isEmpty {
            DispatchQueue.main.async {
                statusMessage = "Removing moved songs from Liked Songs..."
            }
            var lastCompleted = 0
            try await client.removeSavedTracks(auth: auth, ids: Array(movedTrackIds)) { completed, _ in
                let delta = max(0, completed - lastCompleted)
                lastCompleted = completed
                DispatchQueue.main.async {
                    progressCompleted += delta
                }
            }
        }
    }

    private func calculateTotalChunks(tracks: [Track], filters: [String: [String]], source: SpotifyClient.TrackSource) -> Int {
        var total = 0
        var movedTrackIds = Set<String>()
        for (_, genres) in filters {
            if genres.isEmpty { continue }
            let selected = Set(genres)
            let matching = tracks.filter { track in
                !selected.isDisjoint(with: track.genres)
            }
            if matching.isEmpty { continue }
            total += Int(ceil(Double(matching.count) / 100.0))
            movedTrackIds.formUnion(matching.map { $0.id })
        }
        if case .likedSongs = source, !movedTrackIds.isEmpty {
            total += Int(ceil(Double(movedTrackIds.count) / 50.0))
        }
        return total
    }

    private func playlistsHeaderRow() -> some View {
        HStack(spacing: 8) {
            Button(action: {
                if selectedPlaylistId.isEmpty, let first = client.playlists.first {
                    selectedPlaylistId = first.id
                }
                isGenreSettingsPresented = true
            }) {
                Image(systemName: "gearshape")
            }
            .buttonStyle(.plain)
            Text("Playlists")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

private struct PlaylistStats {
    struct GenreCount: Identifiable {
        var id: String { name }
        let name: String
        let count: Int
    }

    let totalTracks: Int
    let uniqueArtists: Int
    let uniqueAlbums: Int
    let topGenres: [GenreCount]
    let avgBPM: Double?
    let avgEnergy: Double?
    let avgDanceability: Double?
}

private struct PlaylistStatsSheetView: View {
    let stats: PlaylistStats

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Playlist Stats")
                .font(.headline)

            HStack(spacing: 8) {
                StatPill(label: "Tracks", value: "\(stats.totalTracks)")
                StatPill(label: "Artists", value: "\(stats.uniqueArtists)")
                StatPill(label: "Albums", value: "\(stats.uniqueAlbums)")
                if let bpm = stats.avgBPM {
                    StatPill(label: "Avg BPM", value: "\(Int(bpm.rounded()))")
                }
                if let energy = stats.avgEnergy {
                    StatPill(label: "Avg Energy", value: "\(Int((energy * 100).rounded()))%")
                }
                if let danceability = stats.avgDanceability {
                    StatPill(label: "Avg Dance", value: "\(Int((danceability * 100).rounded()))%")
                }
            }

            if stats.topGenres.isEmpty {
                Text("No genre stats yet.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(stats.topGenres) { item in
                        GenreBarRow(item: item, total: stats.totalTracks)
                    }
                }
            }
        }
        .padding(12)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.secondary.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct GenreBarRow: View {
    let item: PlaylistStats.GenreCount
    let total: Int

    var body: some View {
        HStack(spacing: 8) {
            Text(item.name)
                .font(.caption)
                .frame(width: 150, alignment: .leading)
                .lineLimit(1)

            GeometryReader { geo in
                let width = total > 0 ? (CGFloat(item.count) / CGFloat(total)) * geo.size.width : 0
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.secondary.opacity(0.15))
                    Capsule()
                        .fill(Color.accentColor)
                        .frame(width: max(2, width))
                }
            }
            .frame(height: 10)

            Text("\(item.count)")
                .font(.caption.monospacedDigit())
                .frame(width: 34, alignment: .trailing)

            Text(percentText)
                .font(.caption.monospacedDigit())
                .foregroundColor(.secondary)
                .frame(width: 44, alignment: .trailing)
        }
    }

    private var percentText: String {
        guard total > 0 else { return "0%" }
        let pct = (Double(item.count) / Double(total)) * 100
        return "\(Int(pct.rounded()))%"
    }
}

private struct PlaylistGenreSettingsView: View {
    @EnvironmentObject var client: SpotifyClient
    @Binding var selectedPlaylistId: String
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            HStack(spacing: 0) {
                List(client.playlists, selection: $selectedPlaylistId) { pl in
                    Text(pl.name)
                        .lineLimit(1)
                        .tag(pl.id)
                }
                .frame(minWidth: 220, idealWidth: 260, maxWidth: 320)
                .listStyle(.sidebar)

                Divider()

                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(currentPlaylistName())
                            .font(.headline)
                        if client.availableGenres.isEmpty {
                            Text("No genres available yet. Load a playlist first.")
                                .foregroundColor(.secondary)
                        } else if selectedPlaylistId.isEmpty {
                            Text("Select a playlist to configure genres.")
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(groupedGenres(), id: \.title) { group in
                                DisclosureGroup {
                                    VStack(alignment: .leading, spacing: 6) {
                                        ForEach(group.genres, id: \.self) { genre in
                                            Toggle(genre, isOn: bindingForGenre(genre))
                                                .toggleStyle(.checkbox)
                                        }
                                    }
                                    .padding(.leading, 6)
                                } label: {
                                    Toggle(group.title, isOn: bindingForGroup(group))
                                        .toggleStyle(.checkbox)
                                }
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .padding()
                }
            }
            .navigationTitle("Playlist Filters")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { isPresented = false }
                }
            }
        }
        .frame(minWidth: 720, minHeight: 420)
        .onAppear {
            if selectedPlaylistId.isEmpty, let first = client.playlists.first {
                selectedPlaylistId = first.id
            }
        }
    }

    private func currentPlaylistName() -> String {
        if let match = client.playlists.first(where: { $0.id == selectedPlaylistId }) {
            return match.name
        }
        return "Select a playlist"
    }

    private func bindingForGenre(_ genre: String) -> Binding<Bool> {
        Binding(
            get: { client.genresForPlaylist(selectedPlaylistId).contains(genre) },
            set: { isOn in
                guard !selectedPlaylistId.isEmpty else { return }
                var set = client.genresForPlaylist(selectedPlaylistId)
                if isOn {
                    set.insert(genre)
                } else {
                    set.remove(genre)
                }
                client.setGenres(set, for: selectedPlaylistId)
            }
        )
    }

    private func bindingForGroup(_ group: GenreGroupBucket) -> Binding<Bool> {
        Binding(
            get: {
                let selected = client.genresForPlaylist(selectedPlaylistId)
                return !group.genres.isEmpty && group.genres.allSatisfy { selected.contains($0) }
            },
            set: { isOn in
                guard !selectedPlaylistId.isEmpty else { return }
                var selected = client.genresForPlaylist(selectedPlaylistId)
                if isOn {
                    selected.formUnion(group.genres)
                } else {
                    selected.subtract(group.genres)
                }
                client.setGenres(selected, for: selectedPlaylistId)
            }
        )
    }

    private func groupedGenres() -> [GenreGroupBucket] {
        let genres = client.availableGenres
        if genres.isEmpty { return [] }

        var buckets: [String: [String]] = [:]

        var uncategorized: [String] = []

        for genre in genres {
            let parent = mapGenreToParent(genre)
            if parent == "Other" {
                uncategorized.append(genre)
            } else {
                buckets[parent, default: []].append(genre)
            }
        }

        if !uncategorized.isEmpty {
            buckets["Other", default: []].append(contentsOf: uncategorized)
        }

        var results: [GenreGroupBucket] = []
        for (title, _) in coreGenreRules {
            if let items = buckets[title], !items.isEmpty {
                results.append(GenreGroupBucket(title: title, genres: items.sorted()))
            }
        }
        for (title, _) in optionalGenreRules {
            if let items = buckets[title], !items.isEmpty {
                results.append(GenreGroupBucket(title: title, genres: items.sorted()))
            }
        }
        if let other = buckets["Other"], !other.isEmpty {
            results.append(GenreGroupBucket(title: "Other", genres: other.sorted()))
        }
        return results
    }
}

private struct GenreGroupBucket: Identifiable {
    var id: String { title }
    let title: String
    let genres: [String]
}

private let coreGenreRules: [(String, [String])] = [
    ("Pop", ["pop"]),
    ("Rock", ["rock", "shoegaze", "garage rock", "indie rock", "grunge"]),
    ("Hip-Hop / Rap", ["hip hop", "hip-hop", "rap", "trap", "drill", "boom bap"]),
    ("R&B / Soul", ["r&b", "soul", "neo-soul", "neo soul", "alt-r&b", "alt r&b"]),
    ("Electronic / Dance", ["electronic", "dance", "edm", "house", "techno", "trance", "dubstep", "ambient", "synthwave"]),
    ("Jazz", ["jazz", "bop", "swing"]),
    ("Blues", ["blues"]),
    ("Country", ["country", "bluegrass", "alt-country", "alt country", "americana"]),
    ("Folk / Acoustic", ["folk", "acoustic", "indie folk", "singer-songwriter", "singer songwriter"]),
    ("Metal", ["metal", "death metal", "doom metal", "black metal", "thrash"]),
    ("Punk", ["punk", "emo", "hardcore"]),
    ("Classical", ["classical", "orchestra", "symphony", "baroque", "opera"]),
    ("Soundtrack / Score", ["soundtrack", "score", "film score", "video game music", "ost"]),
    ("World / Global", ["world", "latin", "latin pop", "afrobeat", "afrobeats", "k-pop", "kpop", "j-pop", "jpop", "desi", "bollywood"]),
    ("Experimental / Alternative", ["experimental", "alternative", "avant-garde", "avant garde", "noise"])
]

private let optionalGenreRules: [(String, [String])] = [
    ("Reggae / Ska / Dub", ["reggae", "ska", "dub"]),
    ("Gospel / Christian", ["gospel", "christian"]),
    ("Lo-Fi / Chill / Beats", ["lo-fi", "lofi", "chill", "beats"]),
    ("Children / Family", ["children", "kids", "family"]),
    ("Spoken Word / Comedy", ["spoken word", "comedy"])
]

private func mapGenreToParent(_ genre: String) -> String {
    let lower = genre.lowercased()
    for (title, keywords) in coreGenreRules {
        if keywords.contains(where: { lower.contains($0) }) {
            return title
        }
    }
    for (title, keywords) in optionalGenreRules {
        if keywords.contains(where: { lower.contains($0) }) {
            return title
        }
    }
    return "Other"
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(SpotifyAuth())
            .environmentObject(SpotifyClient())
    }
}
