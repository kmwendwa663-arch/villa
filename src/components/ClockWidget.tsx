import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-24 left-6 sm:bottom-10 sm:left-10 text-left pointer-events-none select-none z-10"
    >
      <div className="glass px-5 py-3 rounded-2xl border-white/10 backdrop-blur-lg">
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white drop-shadow-md">
          {format(time, 'HH:mm')}
        </h1>
        <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase mt-1">
          {format(time, 'EEEE, MMMM do')}
        </p>
      </div>
    </motion.div>
  );
}
