import { Point } from "./primitives";

/**
 * A settings class, which is a singleton pattern.
 * 
 */
export class GlobalSettings {
  isScaled: boolean = false;
  canvasSize: Point;
  backgroundColor: string;
  imageScaleFactor: number;
  disablePBC: boolean = false;

  static #instance: GlobalSettings;

  private constructor(
    canvasSize: Point = new Point(825, 445),
    backgroundColor: string = "#FFFFFF",
    imageScaleFactor: number = 10
  ) {
    this.canvasSize = canvasSize;
    this.backgroundColor = backgroundColor;
    this.imageScaleFactor = imageScaleFactor;
  }

  /**
   * The static getter that controls access to the singleton instance.
   *
   * This implementation allows you to extend the Singleton class while
   * keeping just one instance of each subclass around.
   */
  public static get instance(): GlobalSettings {
    if (!GlobalSettings.#instance) {
      GlobalSettings.#instance = new GlobalSettings();
    }

    return GlobalSettings.#instance;
  }

  static fromJSON(json: any): GlobalSettings {
    GlobalSettings.#instance = new GlobalSettings(
      new Point(json.canvasSize.x, json.canvasSize.y),
      json.backgroundColor,
      json.imageScaleFactor
    );
    if ("disablePBC" in json) {
      GlobalSettings.#instance.disablePBC = json.disablePBC;
    }
    return GlobalSettings.#instance;
  }
}
