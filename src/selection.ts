export interface Selectable {}

class Selection {
  private selectedItems: Selectable[] = [];

  addItem(item: Selectable): void {
    this.selectedItems.push(item);
  }

  setItem(item: Selectable): void {
    this.selectedItems = [item];
  }

  setSelectedItems(items: Selectable[]): void {
    this.selectedItems = items;
  }

  removeItem(item: Selectable): void {
    this.selectedItems = this.selectedItems.filter((i) => i !== item);
  }

  removeLastItem(): void {
    if (this.selectedItems.length > 0) {
      this.selectedItems.pop();
    }
  }

  getSelectedItems(): Selectable[] {
    return this.selectedItems;
  }
  
  getItemsOfClass<T extends Selectable>(cls: new (...args: any[]) => T): T[] {
    return this.selectedItems.filter((item) => item instanceof cls) as T[];
  }

  clearSelection(): void {
    this.selectedItems = [];
  }

  public get empty(): boolean {
    return this.selectedItems.length === 0;
  }
}

export const selection = new Selection();
