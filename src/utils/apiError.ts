export class ApiError extends Error {
  public statusCode: number;
  public code: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message); 
    this.statusCode = statusCode;
    this.code = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
    
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}