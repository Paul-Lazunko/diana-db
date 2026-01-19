import { Request, Response } from '@dto';

export interface ClientRequestOptions {
  executionHandler: (request: Request) => Promise<Response>;
}
