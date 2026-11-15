export class AgentsModuleError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentsModuleError";
  }
}
