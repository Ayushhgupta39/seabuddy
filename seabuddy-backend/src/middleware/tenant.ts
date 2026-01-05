import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { AppError } from './error.js';

/**
 * Tenant Isolation Middleware
 * 
 * For now, this uses a hardcoded tenant ID for development.
 * In production, this will:
 * 1. Extract JWT from Authorization header
 * 2. Verify JWT signature
 * 3. Extract tenantId and userId from JWT payload
 * 4. Attach to req object for use in routes
 * 
 * Multi-tenancy ensures complete data isolation between shipping companies.
 */
export const tenantMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // TODO: Replace with JWT extraction in production
    // const token = req.headers.authorization?.replace('Bearer ', '');
    // if (!token) {
    //   throw new AppError(401, 'Authentication required');
    // }
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // req.tenantId = decoded.tenantId;
    // req.userId = decoded.userId;
    // req.userRole = decoded.role;

    // TEMPORARY: Hardcoded for development (actual UUIDs from database)
    req.tenantId = 'c074ea25-2c5f-44b2-9aa6-6eaf7c2dbc0c';
    req.userId = '5ba2e7df-e6e2-4e41-bf55-0e9b7ca4afd8';
    req.userRole = 'crew';

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware
 * Ensures only users with specific roles can access certain routes
 */
export const requireRole = (...roles: Array<'crew' | 'admin' | 'psychologist'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    next();
  };
};
