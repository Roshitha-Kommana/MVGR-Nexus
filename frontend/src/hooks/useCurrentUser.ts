import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore.js';
import { api, setTokenResolver } from '../services/api.js';
import { User } from '../types/index.js';
import { supabase } from '../lib/supabaseClient.js';

// Setup token resolver once to pull the active Supabase session token
setTokenResolver(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
});

export const useCurrentUser = () => {
  const { supabaseUser, isInitialized } = useAuthStore();
  const isSignedIn = !!supabaseUser;

  const {
    data: dbUser,
    isLoading: isDbLoading,
    error,
    refetch
  } = useQuery<User | null>({
    queryKey: ['currentUser', supabaseUser?.id],
    queryFn: async () => {
      if (!supabaseUser?.id) return null;
      try {
        const response = await api.get(`/users/${supabaseUser.id}`);
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          // User not found in DB -> onboarding needed
          return null;
        }
        throw err;
      }
    },
    enabled: isInitialized && isSignedIn && !!supabaseUser?.id,
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache profile as fresh for 5 minutes
    gcTime: 1000 * 60 * 10    // Keep profile in cache for 10 minutes
  });

  const isLoading = !isInitialized || (isSignedIn && isDbLoading);
  const needsOnboarding = isInitialized && isSignedIn && dbUser === null && !isDbLoading;

  // Compatibility object for existing components referencing clerkUser
  const clerkUser = supabaseUser ? {
    id: supabaseUser.id,
    fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
    primaryEmailAddress: {
      emailAddress: supabaseUser.email || ''
    },
    imageUrl: supabaseUser.user_metadata?.avatar_url || null
  } : null;

  return {
    supabaseUser,
    clerkUser,
    dbUser,
    isLoading,
    isSignedIn,
    needsOnboarding,
    refetch
  };
};

export default useCurrentUser;
