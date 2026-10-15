# Tests

This directory contains tests for the polymer-graph-sketcher application. Tests are divided into **unit/functional tests** (Vitest) and **end-to-end tests** (Playwright).

## Test Structure

```
tests/
├── setup.ts              # Test environment setup and mocks
├── testUtils.ts          # Reusable test utilities (DRY principle)
├── functional/           # Functional unit tests (Vitest + happy-dom)
│   ├── vertexMode.test.ts       # Vertex mode interactions
│   ├── imageExport.test.ts      # Image export functionality
│   └── stopMotionMovie.test.ts  # Stop-motion state management
└── e2e/                  # End-to-end tests (Playwright + real browser)
    └── stopMotionMovie.spec.ts  # Stop-motion with actual rendering
```

## Running Tests

### Unit/Functional Tests (Vitest)

```bash
# Run all unit tests (watch mode)
npm test

# Run unit tests once and exit
npm run test:run

# Run unit tests with UI
npm run test:ui
```

### End-to-End Tests (Playwright)

```bash
# Run E2E tests in headless browser
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Unit Tests vs E2E Tests

### Unit/Functional Tests (Vitest)
- Run in Node.js with happy-dom (simulated browser environment)
- **Fast** (milliseconds per test)
- **Good for**: State management, logic, API interactions
- **Limitations**: 
  - Cannot verify actual canvas rendering
  - Cannot verify actual video encoding
  - Uses mocked browser APIs

### E2E Tests (Playwright)
- Run in real Chromium browser
- **Slower** (seconds per test)
- **Good for**: Visual verification, actual rendering, real browser behavior
- **Capabilities**:
  - Verify actual canvas pixel data
  - Verify video file creation and properties
  - Test real user interactions
  - Verify visual differences between frames

**Rule of thumb**: Use unit tests for state/logic, use E2E tests when you need to verify actual rendering or browser-specific behavior.

## Testing Philosophy

### Functional Testing vs. Implementation Testing

These tests focus on **what the application does**, not **how it does it**:

- ✅ **Test user-facing behavior**: "Clicking on canvas adds a vertex"
- ❌ **Don't test internal implementation**: "addNodeAction is called with correct parameters"

### Key Principles

1. **Test Outcomes, Not Methods**: Verify that the graph contains a new node, not that a specific method was called
2. **DRY (Don't Repeat Yourself)**: Common setup logic is extracted to `testUtils.ts`
3. **Isolated Tests**: Each test is independent and doesn't rely on others
4. **Descriptive Names**: Test names clearly describe the functionality being tested
5. **Arrange-Act-Assert**: Tests follow the AAA pattern for clarity

## Test Utilities

### `testUtils.ts`

Provides reusable helpers following DRY principles:

- `createMockCanvas()`: Create test canvas
- `createMockUIElements()`: Setup DOM elements
- `createTestContainer()`: Fully configured dependency container
- `createTestGraph()`: Pre-populated test graph
- `simulateCanvasClick()`: Simulate user clicks
- `extractDimensionsFromDataURL()`: Parse exported image dimensions
- `cleanupTestEnvironment()`: Clean up after tests
- `createCanvasRenderingSpy()`: Spy on canvas operations
- `waitFor()`: Wait for async conditions

### `setup.ts`

Configures the test environment:

- Canvas API mocks for happy-dom environment
- MediaRecorder mock for video tests
- URL object mocks for blob handling
- requestAnimationFrame mock

## Mocking Strategy

Tests use minimal mocking focused on browser APIs not available in the test environment:

1. **Canvas 2D Context**: Mock rendering methods to prevent errors
2. **MediaRecorder**: Mock video recording API
3. **URL.createObjectURL**: Mock blob URL creation
4. **DOM Elements**: Mock UI elements for integration

We **don't mock** application code - tests use real implementations to ensure accurate functional testing.

## Adding New Tests

When adding new tests:

1. Create test file in `tests/functional/`
2. Use utilities from `testUtils.ts` (don't duplicate code)
3. Focus on user-facing functionality
4. Follow the AAA pattern (Arrange, Act, Assert)
5. Use descriptive test names
6. Clean up in `afterEach` hooks

Example:

```typescript
describe('Feature Name - What It Does', () => {
  let container: Container;
  
  beforeEach(() => {
    container = createTestContainer();
    // Additional setup
  });
  
  afterEach(() => {
    cleanupTestEnvironment();
  });
  
  it('should perform expected behavior when user action occurs', () => {
    // Arrange: Set up initial state
    const initialState = getState();
    
    // Act: Perform the action
    performUserAction();
    
    // Assert: Verify the outcome
    expect(getState()).toBe(expectedState);
  });
});
```

## Best Practices Checklist

- [ ] Test describes user-facing functionality
- [ ] No implementation details tested
- [ ] Uses reusable utilities from `testUtils.ts`
- [ ] Follows AAA pattern
- [ ] Cleans up in `afterEach`
- [ ] Descriptive test name
- [ ] Independent from other tests
