import { create } from 'zustand';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  // Read initial theme preference
  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
  const initialTheme = savedTheme || 'dark';

  // Apply dark class on html element initially
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: initialTheme,
    sidebarOpen: false,
    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebar: (open: boolean) => set({ sidebarOpen: open }),
  };
});

export default useUIStore;
