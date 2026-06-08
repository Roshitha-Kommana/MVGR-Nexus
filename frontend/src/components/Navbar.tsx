import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { Home as HomeIcon, Search, Plus, Award, User, BookOpen, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabaseClient.js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Navbar = () => {
  const { dbUser, isSignedIn } = useCurrentUser();

  if (!isSignedIn || !dbUser) return null;

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
    }
  };

  const navItems = [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/browse', label: 'Explore', icon: Search },
    ...(dbUser.role === 'admin' ? [{ to: '/admin', label: 'Admin Panel', icon: ShieldAlert }] : []),
    { to: '/placement', label: 'Placement', icon: Award },
    { to: '/trash', label: 'My Trash', icon: Trash2 },
    { to: `/profile/${dbUser.supabaseUserId}`, label: 'Profile', icon: User }
  ];

  return (
    <>
      {/* 1. Mobile Bottom Navbar (below md breakpoint) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[72px] bg-white dark:bg-[#2A251D] border-t border-[#E6DFD3] dark:border-[#3A342B] shadow-[0_-2px_16px_rgba(212, 168, 67,0.04)] flex items-center justify-around px-2 z-40 rounded-t-2xl font-body">
        {/* Home Tab */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center w-14 h-12 transition-colors duration-150",
              isActive ? "text-[#D4A843]" : "text-[#8C8270] dark:text-[#A09685]"
            )
          }
        >
          <HomeIcon size={20} />
          <span className="text-[10px] font-medium mt-1">Home</span>
        </NavLink>

        {/* Explore Tab */}
        <NavLink
          to="/browse"
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center w-14 h-12 transition-colors duration-150",
              isActive ? "text-[#D4A843]" : "text-[#8C8270] dark:text-[#A09685]"
            )
          }
        >
          <Search size={20} />
          <span className="text-[10px] font-medium mt-1">Explore</span>
        </NavLink>

        {/* Center Upload FAB */}
        <div className="relative -top-5 flex items-center justify-center w-14 h-14">
          <div className="absolute inset-0 bg-[#D4A843]/20 rounded-full blur-sm fab-pulse" />
          <NavLink
            to="/upload"
            className="relative z-10 flex items-center justify-center w-14 h-14 bg-[#D4A843] hover:bg-[#B58B2F] text-white rounded-full shadow-[0_4px_16px_rgba(212, 168, 67,0.3)] active:scale-95 transition-all duration-150"
          >
            <Plus size={24} />
          </NavLink>
        </div>

        {/* Placement or Admin Tab */}
        {dbUser.role === 'admin' ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center justify-center w-14 h-12 transition-colors duration-150",
                isActive ? "text-[#D4A843]" : "text-[#8C8270] dark:text-[#A09685]"
              )
            }
          >
            <ShieldAlert size={20} />
            <span className="text-[10px] font-medium mt-1">Admin</span>
          </NavLink>
        ) : (
          <NavLink
            to="/placement"
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center justify-center w-14 h-12 transition-colors duration-150",
                isActive ? "text-[#D4A843]" : "text-[#8C8270] dark:text-[#A09685]"
              )
            }
          >
            <Award size={20} />
            <span className="text-[10px] font-medium mt-1">Placement</span>
          </NavLink>
        )}

        {/* Profile Tab */}
        <NavLink
          to={`/profile/${dbUser.supabaseUserId}`}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center w-14 h-12 transition-colors duration-150",
              isActive ? "text-[#D4A843]" : "text-[#8C8270] dark:text-[#A09685]"
            )
          }
        >
          <User size={20} />
          <span className="text-[10px] font-medium mt-1">Profile</span>
        </NavLink>
      </nav>

      {/* 2. Desktop Left Sidebar (md breakpoint and up) */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-[#E6DFD3] dark:border-[#3A342B] bg-[#FBF8F3] dark:bg-[#1E1B15] p-6 justify-between z-30 font-body">
        <div className="space-y-8">
          {/* Logo Branding */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <DotLottieReact
                src="/logo.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-sm text-[#2C2518] dark:text-[#EFECE6] leading-none tracking-tight">
                MVGR Nexus
              </span>
              <span className="text-[9px] font-bold text-[#8C8270] dark:text-[#A09685] tracking-wider uppercase mt-0.5 font-heading">
                Material Hub
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-150",
                      isActive
                        ? "bg-[#D4A843] text-white shadow-[0_4px_16px_rgba(212, 168, 67,0.15)]"
                        : "text-[#8C8270] dark:text-[#A09685] hover:bg-[#EAE5DB]/40 dark:hover:bg-[#2A251D]/40 hover:text-[#2C2518] dark:hover:text-[#EFECE6]"
                    )
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Upload Button */}
          <div className="pt-2 px-1">
            <NavLink
              to="/upload"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-tr from-[#D4A843] to-amber-500 hover:from-[#B58B2F] hover:to-amber-600 text-white rounded-xl font-heading font-extrabold text-xs tracking-wide shadow-lg shadow-[#D4A843]/15 hover:scale-[1.02] duration-150 transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>UPLOAD NOTES</span>
            </NavLink>
          </div>
        </div>

        {/* Bottom Profile Details & Logout */}
        <div className="border-t border-[#E6DFD3] dark:border-[#3A342B] pt-4 flex items-center justify-between">
          <NavLink
            to={`/profile/${dbUser.supabaseUserId}`}
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center overflow-hidden shrink-0">
              {dbUser.photoUrl ? (
                <img src={dbUser.photoUrl} alt={dbUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black uppercase text-[#D4A843]">
                  {dbUser.name.substring(0, 2)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#2C2518] dark:text-[#EFECE6] line-clamp-1 leading-none">
                {dbUser.name}
              </span>
              <span className="text-[8px] font-extrabold text-[#D4A843] uppercase mt-0.5 tracking-wider">
                {dbUser.role}
              </span>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            className="p-2 text-[#8C8270] dark:text-[#A09685] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
