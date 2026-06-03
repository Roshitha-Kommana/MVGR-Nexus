import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser } from './hooks/useCurrentUser.js';
import { useAuthStore } from './store/authStore.js';
import { supabase } from './lib/supabaseClient.js';

// Page imports
import Home from './pages/Home.js';
import Browse from './pages/Browse.js';
import MaterialDetail from './pages/MaterialDetail.js';
import Upload from './pages/Upload.js';
import Profile from './pages/Profile.js';
import Placement from './pages/Placement.js';
import Admin from './pages/Admin.js';
import Onboarding from './pages/Onboarding.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Trash from './pages/Trash.js';

// Component imports
import Navbar from './components/Navbar.js';
import TopHeader from './components/TopHeader.js';
import ElephantLoader from './components/ElephantLoader.js';
import { ShieldAlert } from 'lucide-react';

const queryClient = new QueryClient();

// 1. Require Auth Gate to redirect unauthenticated users to /login
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <ElephantLoader fullscreen text="Verifying credentials..." />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// 2. Onboarding Guard to intercept users and force completion of curriculum info
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { needsOnboarding, isLoading, isSignedIn } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isSignedIn && needsOnboarding && location.pathname !== '/onboard') {
      navigate('/onboard');
    }
  }, [needsOnboarding, isLoading, isSignedIn, location.pathname, navigate]);

  if (isLoading) {
    return <ElephantLoader fullscreen text="Verifying onboarding status..." />;
  }

  return <>{children}</>;
};

// 3. Role protection guard for UI route paths
const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { dbUser, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && dbUser) {
      if (!allowedRoles.includes(dbUser.role)) {
        alert('Forbidden: Insufficient privileges.');
        navigate('/');
      }
    }
  }, [dbUser, isLoading, navigate, allowedRoles]);

  if (isLoading) {
    return <ElephantLoader fullscreen text="Verifying account role..." />;
  }

  return dbUser && allowedRoles.includes(dbUser.role) ? <>{children}</> : null;
};

// 4. Main layout wrapper mounting navbar
const MainLayout = () => {
  const location = useLocation();
  const { isSignedIn } = useCurrentUser();
  const hideHeader = ['/onboard', '/login', '/register'].includes(location.pathname);
  const showNav = isSignedIn && !hideHeader;
  const isAuthPage = hideHeader;

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#1E1B15] text-[#2C2518] dark:text-[#EFECE6] flex flex-col md:flex-row transition-colors duration-200">
      {showNav && <Navbar />}
      
      <div className={`flex-1 flex flex-col min-h-screen overflow-x-hidden relative ${showNav ? 'md:pl-64' : ''}`}>
        {isSignedIn && !hideHeader && <TopHeader />}
        
        <main className={`flex-1 w-full ${
          isAuthPage
            ? 'p-0'
            : 'px-4 sm:px-6 lg:px-8 py-5 pb-[92px] md:pb-8'
        }`}>
          <Routes>
            {/* Public / Auth paths */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/onboard" element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            } />
            
            {/* Protected Routes (Require sign-in and onboarding) */}
            <Route path="/browse" element={
              <RequireAuth>
                <OnboardingGuard>
                  <Browse />
                </OnboardingGuard>
              </RequireAuth>
            } />
            
            <Route path="/material/:id" element={
              <RequireAuth>
                <OnboardingGuard>
                  <MaterialDetail />
                </OnboardingGuard>
              </RequireAuth>
            } />
            
            <Route path="/profile/:supabaseUserId" element={
              <RequireAuth>
                <OnboardingGuard>
                  <Profile />
                </OnboardingGuard>
              </RequireAuth>
            } />
            
            <Route path="/placement" element={
              <RequireAuth>
                <OnboardingGuard>
                  <Placement />
                </OnboardingGuard>
              </RequireAuth>
            } />
  
            {/* Open upload route for all onboarded users */}
            <Route path="/upload" element={
              <RequireAuth>
                <OnboardingGuard>
                  <Upload />
                </OnboardingGuard>
              </RequireAuth>
            } />
  
            {/* Trash management */}
            <Route path="/trash" element={
              <RequireAuth>
                <OnboardingGuard>
                  <Trash />
                </OnboardingGuard>
              </RequireAuth>
            } />

            {/* Admin panel */}
            <Route path="/admin" element={
              <RequireAuth>
                <OnboardingGuard>
                  <RoleGuard allowedRoles={['admin']}>
                    <Admin />
                  </RoleGuard>
                </OnboardingGuard>
              </RequireAuth>
            } />
  
            {/* Fallback 404 handler */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center text-center py-20 gap-2 font-body">
                <ShieldAlert size={48} className="text-[#FF6B6B]" />
                <h2 className="font-heading font-black text-lg text-text-light">404 - Page Not Found</h2>
                <p className="text-xs text-text-lightMuted">The section you are searching for does not exist.</p>
                <Link to="/" className="text-xs font-bold text-[#D4A843] underline mt-2">Go Home</Link>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Global App wrapper with providers
export default function App() {
  useEffect(() => {
    // 1. Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setInitialized(true);
    });

    // 2. Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
