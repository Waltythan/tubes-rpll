export class ApiError extends Error {
  public statusCode: number;
  public code: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(statusCode: number, message: string, isOperational = true, details?: unknown) {
    super(message); 
    this.statusCode = statusCode;
    this.code = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}