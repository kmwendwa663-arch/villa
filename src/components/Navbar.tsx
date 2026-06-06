import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Home, MessageSquare, User, Compass, PlusSquare, Settings as SettingsIcon, EyeOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot } from '../lib/firebase';

export function Navbar() {
  const { profile } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrollVisible, setScrollVisible] = useState(true);
  const [isManualCollapsed, setIsManualCollapsed] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => doc.data());
      const count = messagesList.filter(
        (m: any) => m.receiverId === profile.uid && m.seen === false
      ).length;
      setUnreadCount(count);
    }, (error) => {
      console.error("Navbar incoming messages badge error:", error);
    });

    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    let lastScroll = 0;
    const handleScroll = (e: any) => {
      // Catch scroll on window or any nested document node container
      const scrollTop = e.target?.scrollTop || window.scrollY || 0;
      
      // If scroll is near top or scrolling upwards, show. Otherwise hide on downwards scroll.
      if (scrollTop > lastScroll && scrollTop > 60) {
        setScrollVisible(false);
      } else {
        setScrollVisible(true);
      }
      lastScroll = scrollTop;
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Explore', icon: Compass, path: '/search' },
    { name: 'Create', icon: PlusSquare, path: '/create' },
    { name: 'Messages', icon: MessageSquare, path: '/chat' },
    { name: 'Profile', icon: User, path: profile ? `/profile/${profile.uid}` : '/login' },
  ];

  if (!profile) return null;

  const isDockVisible = scrollVisible && !isManualCollapsed;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        {!isDockVisible ? (
          <motion.div
            key="collapsed-indicator"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="pointer-events-auto cursor-pointer flex flex-col items-center gap-1 group pb-2"
            onClick={() => {
              setIsManualCollapsed(false);
              setScrollVisible(true);
            }}
          >
            {/* Elegant iOS-style horizontal home/dock handle line */}
            <div className="w-12 h-1 bg-gradient-to-r from-amber-500/30 via-gold-500/80 to-amber-500/30 group-hover:from-amber-500/60 group-hover:via-gold-400 group-hover:to-amber-500/60 rounded-full shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all duration-300 hover:w-20 hover:scale-110" />
            
            {/* Micro subtle prompt shown on hover */}
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-gold-400/40 group-hover:text-gold-400/80 transition-colors pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Reveal Dock
            </span>
          </motion.div>
        ) : (
          <motion.nav
            key="expanded-navbar"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="glass-dark px-2 py-1.5 rounded-2xl flex items-center gap-0.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.65)] border border-white/10 pointer-events-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              let isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              if (item.name === 'Profile' && (location.pathname.startsWith('/profile') || location.pathname === '/edit-profile')) {
                isActive = true;
              }
              if (item.name === 'Messages' && (location.pathname.startsWith('/chat') || location.pathname.startsWith('/new-message'))) {
                isActive = true;
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative p-2 rounded-xl transition-all duration-300 group flex items-center justify-center ${
                    isActive ? 'text-gold-500 bg-gold-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="relative flex flex-col items-center p-0.5">
                    <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110 text-gold-400' : 'group-hover:scale-110'}`} />
                    {item.name === 'Messages' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-gold-500 text-black text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black animate-pulse">
                        {unreadCount}
                      </span>
                    )}

                    {/* Compact Premium Minimal Custom Tooltip */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/95 text-[8px] font-black uppercase tracking-[0.25em] text-gold-400 border border-gold-500/20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:bottom-12 transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.85)] whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-gold-500/10 border border-gold-500/30 rounded-xl z-[-1]"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                </Link>
              );
            })}
            
            <div className="w-[1px] h-4 bg-white/10 mx-1.5" />
            
            {/* Settings link */}
            <Link
              to="/settings"
              className={`p-2 rounded-xl transition-all duration-300 group relative ${
                location.pathname === '/settings' ? 'text-gold-500 bg-gold-500/10' : 'text-white/25 hover:text-white hover:bg-white/5'
              }`}
            >
              <SettingsIcon className="w-4.5 h-4.5" />
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/95 text-[8px] font-black uppercase tracking-[0.25em] text-gold-400 border border-gold-500/20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:bottom-12 transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                Settings
              </div>
            </Link>

            <div className="w-[1px] h-4 bg-white/10 mx-1.5" />

            {/* Manual Dismiss Trigger */}
            <button
              onClick={() => setIsManualCollapsed(true)}
              className="p-2 rounded-xl text-white/20 hover:text-gold-400 hover:bg-white/5 transition-all duration-300 group relative cursor-pointer"
            >
              <EyeOff className="w-4.5 h-4.5" />
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/95 text-[8px] font-black uppercase tracking-[0.25em] text-gold-400 border border-gold-500/20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:bottom-12 transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                Hide Bar
              </div>
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
