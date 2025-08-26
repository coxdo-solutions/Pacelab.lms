declare module 'passport-jwt' {
  import { Strategy as BaseStrategy } from 'passport-strategy';
  import { Request } from 'express';

  export interface JwtFromRequestFunction {
    (req: Request): string | null;
  }

  export interface StrategyOptions {
    secretOrKey: string;
    jwtFromRequest: JwtFromRequestFunction;
    ignoreExpiration?: boolean;
    passReqToCallback?: boolean;
  }

  export class Strategy extends BaseStrategy {
    constructor(options: StrategyOptions, verify: (...args: any[]) => any);
  }

  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
  };
}
