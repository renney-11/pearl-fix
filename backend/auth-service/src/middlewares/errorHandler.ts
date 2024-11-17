import { Request, Response, NextFunction } from "express";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error",
  });

  next();
};

export default errorHandler;
