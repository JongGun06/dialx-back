// Path: src/types/express.d.ts

declare namespace Express {
  export interface Request {
    user?: {
      sub: string;
      email: string;
      refreshToken?: string;
    };
  }
}