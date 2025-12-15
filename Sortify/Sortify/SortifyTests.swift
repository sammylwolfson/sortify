import Testing
import SwiftUI
@testable import Sortify

@Suite("Sortify basic tests")
struct SortifyTests {
    @Test("App launches root view")
    func appLaunchesRootView() async throws {
        // Verify the App struct exists and root ContentView can be constructed
        _ = SortifyApp() // smoke construct
        // Construct ContentView to ensure no missing dependencies at init time
        _ = ContentView()
        #expect(true, "App and ContentView should be constructible")
    }

    @Test("Core Data round-trip using PersistenceController.shared")
    func coreDataRoundTrip() async throws {
        // Ensure the shared persistence controller is available
        let controller = PersistenceController.shared
        let context = controller.container.viewContext

        // Create a trivial NSManagedObject. If your model has an entity named "Item"
        // (as in the default Core Data template), this will work. Otherwise, this
        // test will be skipped gracefully.
        if let entity = NSEntityDescription.entity(forEntityName: "Item", in: context) {
            let object = NSManagedObject(entity: entity, insertInto: context)
            object.setValue(Date(), forKey: "timestamp") // default template attribute

            try context.save()

            let request = NSFetchRequest<NSManagedObject>(entityName: "Item")
            request.fetchLimit = 1
            let results = try context.fetch(request)
            #expect(!results.isEmpty, "Should fetch at least one saved Item")
        } else {
            // Skip if the project doesn't contain the default template entity
            Issue.record("Skipping: No entity named 'Item' in the Core Data model.")
        }
    }
}
