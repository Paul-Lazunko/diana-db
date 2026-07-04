import { Request } from '@dto';

export interface ServerOptions {
  port: number;
  ssl?: {
    key: Buffer;
    cert: Buffer;
    ca?: Buffer;
    requestCert?: boolean;
    rejectUnauthorized?: boolean;
  };
  handler: (request: Request) => void;
}
