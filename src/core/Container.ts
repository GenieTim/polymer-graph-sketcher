/**
 * Dependency Injection Container
 * Manages service registration and retrieval for the application
 */
export class Container {
  private static instance: Container;
  private services = new Map<string, any>();

  private constructor() {}

  /**
   * Gets the singleton instance of the Container
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Registers a service in the container
   * @param key - The key to register the service under
   * @param service - The service instance to register
   */
  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  /**
   * Retrieves a service from the container
   * @param key - The key the service was registered under
   * @returns The service instance
   * @throws Error if service is not found
   */
  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not found in container`);
    }
    return service as T;
  }

  /**
   * Checks if a service is registered
   * @param key - The key to check
   * @returns True if the service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clears all registered services (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }
}
