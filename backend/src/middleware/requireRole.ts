import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRoles: ('student' | 'educator' | 'admin' | 'contributor')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Profile required', 
        message: 'You must complete the onboarding flow before performing this action.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'You do not have the required permissions to perform this action.' 
      });
    }

    next();
  };
};
export default requireRole;
