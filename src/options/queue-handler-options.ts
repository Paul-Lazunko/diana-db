import { Request, Response } from '@dto';

export interface QueueHandlerOptions {
  handler: (data: Request | Response) => void;
}
