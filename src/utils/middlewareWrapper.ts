// server/src/utils/middlewareWrapper.ts
import { NextFunction, Request, Response } from "express";

// Tambahkan <R> yang merupakan turunan dari Request
type MiddlewareHandler<T, R = Request> = (
  req: R, 
  res: Response,
  next: NextFunction
) => Promise<T> | T;

// Gunakan <R> di fungsi wrapper juga
export function middlewareWrapper<T, R extends Request = Request>(
  handler: MiddlewareHandler<T, R>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Kita cast 'req' menjadi 'R' agar handler mau menerimanya
      await handler(req as R, res, next);
      next();
    } catch (error) {
      next(error);
    }
  };
}