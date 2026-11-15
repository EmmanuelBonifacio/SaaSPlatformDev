export class MemoryModuleError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "MemoryModuleError";
  }
}
