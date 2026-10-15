# GitHub Copilot Instructions for Polymer Graph Sketcher

## Project Overview

This is a TypeScript-based web application for creating 2D sketches of polymer bead-spring networks. The application uses **Vite** as the build tool and follows **object-oriented design patterns** with a strong emphasis on maintainability and extensibility.

**Key Technologies:**
- TypeScript
- Vite (build tool)
- Canvas API for rendering
- Vitest for unit tests
- Playwright for E2E tests

## Architecture & Design Patterns

This codebase heavily utilizes established design patterns. When contributing code, **always follow these patterns**:

### 1. **Dependency Injection Container Pattern**
- The `Container` class (`src/core/Container.ts`) is a **Singleton** that manages service registration and retrieval
- Services are registered once and retrieved throughout the application
- **Always use the container** to access services rather than creating new instances
- Example: `container.get<Graph>("graph")` instead of `new Graph()`

### 2. **Command Pattern (Actions)**
- All user actions that modify state implement the `Action` interface (`src/actions/Action.ts`)
- Each action has `do()` and `undo()` methods for undo/redo functionality
- **Create new Action classes** for any new operations that modify the graph
- Actions are managed by `ActionManager` for history tracking
- Example: `AddNodeAction`, `DeleteEdgesAction`, `MoveNodesAction`

### 3. **Strategy Pattern (Interaction Modes)**
- Different interaction modes implement the `InteractionMode` interface (`src/interaction-modes/InteractionMode.ts`)
- Each mode defines how the canvas responds to user input (click, mouse move, etc.)
- Modes are managed by `ModeFactory` for easy switching
- **Create new modes** for new interaction behaviors
- Example: `SelectMode`, `EdgeMode`, `RandomWalkMode`

### 4. **Facade Pattern**
- Complex subsystems are wrapped in Facade classes for simplified interfaces:
  - `CanvasFacade`: Wraps Canvas API operations
  - `UIFacade`: Wraps UI/DOM interactions
  - `MovieFacade`: Wraps animation/recording functionality
- **Use facades** to interact with complex subsystems

### 5. **Observer Pattern**
- `Observable` and `ObservableValue` classes (`src/core/Observable.ts`) implement reactive state
- Used for state management and triggering re-renders
- **Subscribe to observables** for reactive updates

### 6. **Service Layer Pattern**
- Business logic is encapsulated in service classes (`src/services/`):
  - `GraphOperationsService`: Graph manipulation operations
  - `SelectionService`: Node/edge selection management
  - `SimulationService`: Physics simulation operations
  - `FileService`: Import/export operations
  - `StorageService`: Local storage persistence

## DRY Principles - Critical Requirements

**Don't Repeat Yourself (DRY)** is a core principle of this codebase. Follow these rules strictly:

### 1. **Reuse Existing Components**
- Before creating new code, search for existing implementations
- Check `src/utils/` for utility functions
- Check `src/services/` for business logic
- Check `src/rendering/` for drawable components
- **Never duplicate functionality** that already exists

### 2. **Extract Common Patterns**
- If you write similar code twice, extract it into a shared function or class
- Use inheritance for shared behavior (e.g., `Line` and `PartialLine`)
- Use composition over duplication

### 3. **Centralize Configuration**
- Settings are centralized in `GlobalSettings` (`src/utils/GlobalSettings.ts`)
- Don't hardcode values; use configuration objects
- Don't duplicate default values across files

### 4. **Action Pattern for State Changes**
- **Never directly modify graph state** outside of Action classes
- Reuse existing actions when possible
- Compose actions for complex operations rather than duplicating logic

### 5. **Mode Pattern for Interactions**
- Don't duplicate event handling logic
- Create or extend interaction modes for new behaviors
- Share common logic through helper methods or base classes

## Code Organization

### Directory Structure
```
src/
├── actions/          # Command pattern implementations for undo/redo
├── animation/        # Movie recording and animation
├── controllers/      # Event handling and coordination
├── core/            # Core application infrastructure (Container, Observable)
├── facades/         # Facade pattern implementations
├── interaction-modes/ # Strategy pattern for user interactions
├── models/          # Domain models (Graph, Node, Edge, Point, Vector2d)
├── rendering/       # Canvas rendering abstractions (Drawable interface)
├── services/        # Business logic layer
├── topology/        # Graph topology operations
└── utils/           # Utility functions and settings
```

### File Naming Conventions
- Classes use PascalCase: `GraphOperationsService.ts`
- Interfaces use PascalCase: `InteractionMode.ts`
- Utils use PascalCase for the main export: `GlobalSettings.ts`
- Index files re-export for cleaner imports: `index.ts`

## Testing Requirements

When adding new features:

1. **Write unit tests** for business logic in `tests/functional/`
2. **Write E2E tests** for user interactions in `tests/e2e/`
3. Use the testing utilities in `tests/testUtils.ts`
4. Follow existing test patterns for consistency

Run tests with:
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests

## Key Concepts

### Graph Model
- `Graph` contains `Node` objects and `Edge` objects
- Nodes have positions (`Point`), radius, colors
- Edges connect two nodes and have color, width properties
- Graph operations maintain integrity (no orphaned edges)

### Rendering Pipeline
1. `Application.render()` orchestrates the rendering
2. Graph elements are converted to `Drawable` objects
3. `Drawable` objects are drawn to canvas via `CanvasFacade`
4. Rendering order: Background → Edges → Extra Elements → Nodes → Selection → Border

### Selection System
- `SelectionService` manages selected nodes
- Only nodes can be selected (not edges directly)
- Edges are selected via their connected nodes
- Selection affects property updates and operations

### Undo/Redo System
- `ActionManager` maintains history stacks
- All state changes go through Action classes
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)

## Common Patterns to Follow

### When Adding New Features

1. **New Graph Operation:**
   - Create an Action class in `src/actions/`
   - Implement `do()` and `undo()` methods
   - Use the Action through `ActionManager`

2. **New Interaction Mode:**
   - Create a class implementing `InteractionMode` in `src/interaction-modes/`
   - Register it in `ModeFactory`
   - Add keyboard shortcut in `KeyboardController`
   - Add UI button in `UIController`

3. **New Rendering Element:**
   - Implement the `Drawable` interface in `src/rendering/`
   - Implement `draw()` method for Canvas API
   - Consider SVG export compatibility

4. **New Service:**
   - Create service class in `src/services/`
   - Register in Container during app initialization
   - Use dependency injection to access other services

### Code Style Guidelines

- Use **descriptive variable names** (not single letters except loops)
- Add **JSDoc comments** for classes and public methods
- Use **type annotations** explicitly (avoid `any` unless necessary)
- Prefer **const** over let when values don't change
- Use **arrow functions** for callbacks
- Follow **single responsibility principle**

## Performance Considerations

- Canvas rendering can be expensive; avoid unnecessary re-renders
- Use `Application.render()` for controlled rendering
- Temporary drawables (like partial edges) are excluded from exports

## Questions to Ask Yourself

Before writing code:
1. Does this functionality already exist? (Check thoroughly!)
2. Can I reuse an existing Action or Mode?
3. Should this be in a Service or Utility class?
4. Am I following the established patterns?
5. Will this code need undo/redo support? (Use Action pattern)
6. Is this DRY, or am I duplicating code?

---

**Remember:** This codebase values **maintainability, extensibility, and adherence to design patterns** over quick hacks. Take time to understand the architecture before making changes.
