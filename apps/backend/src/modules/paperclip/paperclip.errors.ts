export class PaperclipModuleError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "PaperclipModuleError";
  }
}
