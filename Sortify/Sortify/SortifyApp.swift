//
//  SortifyApp.swift
//  Sortify
//
//  Created by Sammy on 12/15/25.
//

import SwiftUI
import CoreData

@main
struct SortifyApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
