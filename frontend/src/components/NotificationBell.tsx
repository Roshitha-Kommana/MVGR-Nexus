import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { Notification } from '../types/index.js';
import { Bell, Check, Link as LinkIcon, RefreshCcw } from 'lucide-react';
import ElephantLoader from './ElephantLoader.js';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface NotificationBellProps {
  variant?: 'standard' | 'minimal';
}

export const NotificationBell = ({ variant = 'standard' }: NotificationBellProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch last 20 notifications
  const { data, isLoading, refetch } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000 // Poll every 30 seconds for live notifications
  });

  const notificationsList = data?.notifications || [];
  const unreadCount = notificationsList.filter(n => !n.isRead).length;

  // Mark single as read
  const readOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read
  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const toggleOpen = () => setIsOpen(prev => !prev);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative font-body" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className={clsx(
          variant === 'minimal'
            ? "p-2 rounded-lg flex items-center justify-center text-[#8C8270] dark:text-[#A09685] hover:text-[#2C2518] dark:hover:text-[#EFECE6] hover:bg-[#EAE5DB]/50 dark:hover:bg-[#2A251D]/60 transition-colors duration-150 relative"
            : "p-2 rounded-xl relative border border-background-borderLight dark:border-background-borderDark bg-background-light/40 dark:bg-background-dark/40 hover:bg-primary/10 text-text-light dark:text-text-dark transition hover:scale-105 duration-200"
        )}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          variant === 'minimal' ? (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B6B] rounded-full border border-white dark:border-[#1E1B15] animate-pulse" />
          ) : (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 border-background-light dark:border-background-dark animate-pulse">
              {unreadCount}
            </span>
          )
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-xl border border-background-borderLight dark:border-background-borderDark bg-background-cardLight dark:bg-background-cardDark shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-background-light/50 dark:bg-background-dark/50 border-b border-background-borderLight dark:border-background-borderDark">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-light dark:text-text-dark uppercase tracking-wider">Alerts</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-extrabold">
                  {unreadCount} New
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => readAllMutation.mutate()}
                  disabled={readAllMutation.isPending}
                  className="text-[10px] font-extrabold text-primary hover:underline"
                >
                  Mark All Read
                </button>
              )}
              <button 
                onClick={() => refetch()}
                className="text-text-lightMuted dark:text-text-darkMuted hover:text-primary transition"
                title="Refresh"
              >
                <RefreshCcw size={12} />
              </button>
            </div>
          </div>

          {/* List panel */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <ElephantLoader size="sm" text="Loading notification feed..." />
            ) : notificationsList.length === 0 ? (
              <div className="text-center py-12 text-xs text-text-lightMuted dark:text-text-darkMuted italic">
                You have no notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notificationsList.map((notif) => {
                  const formattedTime = new Date(notif.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && readOneMutation.mutate(notif.id)}
                      className={clsx(
                        "flex items-start justify-between gap-3 p-3.5 border-b border-background-borderLight/40 dark:border-background-borderDark/40 transition hover:bg-primary/5 cursor-pointer relative",
                        !notif.isRead && "bg-primary/5 dark:bg-primary/[0.03]"
                      )}
                    >
                      {/* Active Blue dot for unread status */}
                      {!notif.isRead && (
                        <div className="absolute top-4.5 left-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <div className="flex-1 pl-1.5">
                        {notif.link ? (
                          <Link 
                            to={notif.link}
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-semibold text-text-light dark:text-text-dark hover:text-primary leading-relaxed block"
                          >
                            {notif.message}
                          </Link>
                        ) : (
                          <p className="text-xs font-semibold text-text-light dark:text-text-dark leading-relaxed">
                            {notif.message}
                          </p>
                        )}
                        <span className="text-[9px] text-text-lightMuted dark:text-text-darkMuted mt-1 block">
                          {formattedTime}
                        </span>
                      </div>

                      {/* Manual mark as read check button */}
                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            readOneMutation.mutate(notif.id);
                          }}
                          className="p-1 rounded-lg text-text-lightMuted dark:text-text-darkMuted hover:text-primary hover:bg-primary/10 transition"
                          title="Mark Read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
