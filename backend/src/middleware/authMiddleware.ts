import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    orgId: string;
    fullName?: string;
  };
}

export const authenticateJwt = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['SUPER_ADMIN', 'HR_MANAGER', 'OFFICE_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
  }
  next();
};
