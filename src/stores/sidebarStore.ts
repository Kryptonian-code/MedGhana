import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
  toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
}));
