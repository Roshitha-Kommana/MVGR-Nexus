import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  supabaseUser: User | null;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  supabaseUser: null,
  isInitialized: false,
  setSession: (session) => set({ 
    session, 
    supabaseUser: session?.user || null 
  }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));

export default useAuthStore;
