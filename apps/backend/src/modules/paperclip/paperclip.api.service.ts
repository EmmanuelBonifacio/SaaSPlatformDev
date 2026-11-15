/**
 * @deprecated SP-7 fase 5 — ponte HTTP Paperclip desligada.
 * Mantido para não quebrar imports legados do módulo deprecated.
 */
export class PaperclipApiError extends Error {
  readonly statusCode = 410;

  constructor(
    message = "A ponte Paperclip foi desligada. Use o módulo /agents.",
  ) {
    super(message);
    this.name = "PaperclipApiError";
  }
}

export class PaperclipApiService {
  private fail(): never {
    throw new PaperclipApiError();
  }

  listCompanies(): never {
    return this.fail();
  }

  createCompany(_name: string, _marker: string): never {
    return this.fail();
  }

  listAgents(_companyId: string): never {
    return this.fail();
  }

  listIssues(_companyId: string, _limit?: number, _offset?: number): never {
    return this.fail();
  }

  createIssue(
    _companyId: string,
    _input: { title: string; description: string; status: string },
  ): never {
    return this.fail();
  }

  updateIssue(
    _issueId: string,
    _input: Record<string, unknown>,
  ): never {
    return this.fail();
  }

  getIssue(_issueId: string): never {
    return this.fail();
  }

  listComments(_issueId: string): never {
    return this.fail();
  }

  addComment(
    _issueId: string,
    _body: string,
    _clientRequestId?: string,
  ): never {
    return this.fail();
  }
}

export const paperclipApiService = new PaperclipApiService();
