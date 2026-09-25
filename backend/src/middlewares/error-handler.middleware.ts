import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof SyntaxError && (err as SyntaxError & { status?: number }).status === 400) {
    res.status(400).json({
      success: false,
      error: { message: 'JSON malformado en el cuerpo de la petición' },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: { message: 'Error interno del servidor' },
  });
};
