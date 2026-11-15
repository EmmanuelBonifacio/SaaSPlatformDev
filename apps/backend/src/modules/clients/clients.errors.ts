export class ClientsModuleError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ClientsModuleError";
  }
}
