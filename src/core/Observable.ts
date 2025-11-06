/**
 * Observable pattern implementation for state management
 * Allows components to subscribe to and be notified of changes
 */
export class Observable<T> {
  private observers: ((value: T) => void)[] = [];

  /**
   * Subscribe to changes
   * @param observer - Callback function to be called when value changes
   * @returns Unsubscribe function
   */
  subscribe(observer: (value: T) => void): () => void {
    this.observers.push(observer);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all observers of a change
   * @param value - The new value to broadcast
   */
  notify(value: T): void {
    this.observers.forEach(observer => observer(value));
  }

  /**
   * Get the number of current observers
   */
  get observerCount(): number {
    return this.observers.length;
  }

  /**
   * Clear all observers
   */
  clearObservers(): void {
    this.observers = [];
  }
}

/**
 * ObservableValue - Observable with built-in value storage
 */
export class ObservableValue<T> extends Observable<T> {
  private _value: T;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  /**
   * Get the current value
   */
  get value(): T {
    return this._value;
  }

  /**
   * Set the value and notify observers
   */
  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notify(newValue);
    }
  }

  /**
   * Update the value and notify observers even if the value hasn't changed
   */
  forceUpdate(): void {
    this.notify(this._value);
  }
}
