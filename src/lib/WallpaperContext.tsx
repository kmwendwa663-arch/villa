import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wallpaper, WallpaperState, WallpaperInterval } from '../types';

export const WALLPAPERS: Wallpaper[] = [
  { id: 'n1', name: 'Mountain Lake', category: 'Nature', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000' },
  { id: 'n2', name: 'Forest Path', category: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=2000' },
  { id: 's1', name: 'Nebula', category: 'Space', url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=2000' },
  { id: 's2', name: 'Moon Surface', category: 'Space', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=2000' },
  { id: 'c1', name: 'Cyberpunk Tokyo', category: 'City', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=2000' },
  { id: 'c2', name: 'New York Skyline', category: 'City', url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=2000' },
  { id: 'a1', name: 'Fluid Gold', category: 'Abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000' },
  { id: 'a2', name: 'Geometric Lines', category: 'Abstract', url: 'https://images.unsplash.com/photo-1508197149021-ba3126f2f98d?auto=format&fit=crop&q=80&w=2000' },
  { id: 'd1', name: 'Dark Texture', category: 'Dark', url: 'https://images.unsplash.com/photo-1550684848-86a5d8727436?auto=format&fit=crop&q=80&w=2000' },
  { id: 'm1', name: 'Soft Gradient', category: 'Minimal', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000' },
];

interface WallpaperContextType {
  state: WallpaperState;
  setWallpaper: (w: Wallpaper) => void;
  setSolidColor: (c: string | null) => void;
  toggleSlideshow: (active: boolean) => void;
  setInterval: (i: WallpaperInterval) => void;
  toggleFavorite: (id: string) => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WallpaperState>(() => {
    const saved = localStorage.getItem('villa_wallpaper_v2'); // Use v2 to reset potentially corrupted state
    if (saved) return JSON.parse(saved);
    return {
      currentWallpaper: WALLPAPERS[0],
      solidColor: null,
      isSlideshowActive: false,
      slideshowInterval: 10,
      favorites: [],
      recent: [WALLPAPERS[0]], // Store full objects in recent
    };
  });

  useEffect(() => {
    localStorage.setItem('villa_wallpaper_v2', JSON.stringify(state));
  }, [state]);

  const setWallpaper = useCallback((w: Wallpaper) => {
    setState(prev => ({
      ...prev,
      currentWallpaper: w,
      solidColor: null,
      recent: [w, ...prev.recent.filter(item => item.id !== w.id)].slice(0, 12)
    }));
  }, []);

  const setSolidColor = useCallback((c: string | null) => {
    setState(prev => ({ ...prev, solidColor: c, currentWallpaper: c ? null : prev.currentWallpaper }));
  }, []);

  const toggleSlideshow = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, isSlideshowActive: active }));
  }, []);

  const setInterval = useCallback((i: WallpaperInterval) => {
    setState(prev => ({ ...prev, slideshowInterval: i }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      favorites: prev.favorites.includes(id) 
        ? prev.favorites.filter(f => f !== id) 
        : [...prev.favorites, id]
    }));
  }, []);

  // Slideshow Logic
  useEffect(() => {
    if (!state.isSlideshowActive) return;

    const timer = window.setInterval(() => {
      setState(prev => {
        const currentIndex = WALLPAPERS.findIndex(w => w.id === prev.currentWallpaper?.id);
        const nextIndex = (currentIndex + 1) % WALLPAPERS.length;
        return {
          ...prev,
          currentWallpaper: WALLPAPERS[nextIndex],
          solidColor: null
        };
      });
    }, state.slideshowInterval * 1000);

    return () => clearInterval(timer);
  }, [state.isSlideshowActive, state.slideshowInterval]);

  return (
    <WallpaperContext.Provider value={{ state, setWallpaper, setSolidColor, toggleSlideshow, setInterval, toggleFavorite }}>
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  const context = useContext(WallpaperContext);
  if (!context) throw new Error('useWallpaper must be used within WallpaperProvider');
  return context;
}
