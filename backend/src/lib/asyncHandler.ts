import { NextFunction, Request, Response } from "express";

// Express 4 (this repo's version) does not catch a rejected promise from an
// async route handler — an unhandled rejection would crash the process
// instead of reaching errorHandler.ts. Wrapping each async controller here
// keeps every route handler thin (docs/rules/backend.md) instead of
// repeating the same try/catch-and-next in each one.
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
