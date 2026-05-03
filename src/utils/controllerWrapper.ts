// server/src/utils/controllerWrapper.ts
import { NextFunction, Request, Response } from "express";
import { ApiError } from "./apiError";
import { ERROR_CODES } from "./errorCodes";
import { sendResponse } from "./apiResponse";

type ExpressRouteHandler<T> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<T> | T;

export function controllerWrapper<T>(routeHandler: ExpressRouteHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await routeHandler(req, res, next);
      
      if (!res.headersSent) {
        if (result !== undefined) {
          sendResponse(res, 200, 'Request berhasil!', result);
        } else {
          res.status(204).send(); 
        }
      }
    } catch (error: any) {
      // 1. LOGGING: Tetap cetak di terminal untuk debugging kamu
      console.error(`[ERROR LOG]: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }

      // 2. IDENTIFIKASI: Cek apakah ini ApiError atau Bug
      const isOperational = error instanceof ApiError;
      console.log(isOperational ? '[Operational Error]' : '[System Error]');
      
      // 3. SELEKSI DATA: Ambil dari ApiError atau paksa ke System Error 500
      const statusCode = isOperational ? error.statusCode : 500;
      const responseMessage = isOperational ? error.message : ERROR_CODES.SYSTEM.INTERNAL_ERROR.message;
      const internalCode = isOperational ? (error as any).code : ERROR_CODES.SYSTEM.INTERNAL_ERROR.code;

      // 4. RETURNING: Kirim response ke Postman/Client agar tidak "hanging"
      return res.status(statusCode).json({
        success: false,
        message: responseMessage,
        code: internalCode,
      });
    }
  };
}