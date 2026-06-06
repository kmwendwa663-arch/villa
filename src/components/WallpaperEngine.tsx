import React from 'react';
import { useWallpaper } from '../lib/WallpaperContext';
import { motion, AnimatePresence } from 'motion/react';

export function WallpaperEngine() {
  const { state } = useWallpaper();

  if (state.solidColor) {
    return (
      <div 
        className="fixed inset-0 z-[-1] transition-colors duration-1000"
        style={{ backgroundColor: state.solidColor }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {state.currentWallpaper && (
          <motion.div
            key={state.currentWallpaper.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: { duration: 2, ease: "easeOut" }
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 1 } }}
            className="absolute inset-0"
          >
            <motion.img
              src={state.currentWallpaper.url}
              alt=""
              className="w-full h-full object-cover"
              animate={{
                scale: [1, 1.15],
                x: [0, 20, -20, 0],
                y: [0, -20, 20, 0],
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear"
              }}
            />
            {/* Cinematic overlays */}
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
