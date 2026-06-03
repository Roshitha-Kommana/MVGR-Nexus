import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { NotificationBell } from './NotificationBell.js';
import { BookOpen, LogOut, Trash2 } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { clsx } from 'clsx';

export const TopHeader = () => {
  const { dbUser } = useCurrentUser();
  const location = useLocation();

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0] || fullName;
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home Dashboard';
    if (path.startsWith('/browse')) return 'Explore Materials';
    if (path.startsWith('/upload')) return 'Upload Center';
    if (path.startsWith('/placement')) return 'Placement Hub';
    if (path.startsWith('/profile')) return 'Academic Profile';
    if (path.startsWith('/admin')) return 'Admin Control Center';
    if (path.startsWith('/material/')) return 'Material Details';
    return 'MVGR Nexus';
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
    }
  };

  if (!dbUser) return null;

  return (
    <header className="flex items-center justify-between py-3.5 px-5 bg-[#F5F0E8]/80 dark:bg-[#1E1B15]/80 border-b border-[#E6DFD3] dark:border-[#3A342B]/40 backdrop-blur-md sticky top-0 z-30 transition-all duration-200">
      {/* Left (Desktop blank, Mobile Branding) */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="w-9 h-9 shrink-0 flex items-center justify-center">
          <DotLottieReact
            src="/logo.lottie"
            autoplay
            loop
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-black text-xs text-[#2C2518] dark:text-[#EFECE6] leading-none tracking-tight">
            MVGR Nexus
          </span>
          <span className="text-[8px] font-bold text-[#8C8270] dark:text-[#A09685] tracking-wider uppercase mt-0.5 font-heading">
            Academic Library
          </span>
        </div>
      </div>

      {/* Right: User Profile, Greeting, Bell, and Logout */}
      <div className="flex items-center gap-4 ml-auto">
        {/* User Info (Hidden on mobile to save space) */}
        <div className="hidden sm:flex items-center gap-2.5 border-r border-[#E6DFD3] dark:border-[#3A342B]/40 pr-4">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-text-lightMuted dark:text-text-darkMuted font-medium leading-none">
              {getGreeting()},
            </span>
            <span className="text-xs font-heading font-bold text-text-light dark:text-text-dark leading-normal mt-0.5">
              {getFirstName(dbUser.name)} 👋
            </span>
          </div>
          <Link to={`/profile/${dbUser.supabaseUserId}`} className="relative shrink-0 hover:scale-105 transition-transform duration-200">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
              {dbUser.photoUrl ? (
                <img src={dbUser.photoUrl} alt={dbUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-black text-[10px] text-primary uppercase">
                  {dbUser.name.substring(0, 2)}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <NotificationBell variant="minimal" />

          {/* Trash shortcut — mobile only; desktop uses sidebar */}
          <NavLink
            to="/trash"
            title="My Trash"
            className={({ isActive }) =>
              clsx(
                'md:hidden p-2 rounded-lg transition-colors',
                isActive
                  ? 'text-rose-500 bg-rose-50/20'
                  : 'text-[#8C8270] dark:text-[#A09685] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/10'
              )
            }
          >
            <Trash2 size={18} />
          </NavLink>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="p-2 text-[#8C8270] dark:text-[#A09685] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
