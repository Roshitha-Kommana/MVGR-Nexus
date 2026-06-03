import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SERVER CONFIGURATION ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export const requireAuth = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or malformed Authorization header. Bearer token required.' 
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Use Supabase Client to verify the token securely (handles ES256 and key rotations)
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid user data returned from Supabase Auth.');
      }

      // Attach user credentials to request
      req.auth = {
        userId: data.user.id,
        claims: data.user
      };

      next();
    } catch (err: any) {
      console.warn('JWT Verification failed:', err.message);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired authentication session token.' 
      });
    }
  };
};

export default requireAuth;
