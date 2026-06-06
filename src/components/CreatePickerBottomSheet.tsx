import React from 'react';
import { 
  X, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  Image as ImageIcon, 
  Video, 
  Type, 
  Activity, 
  Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';

interface ContentTypeCard {
  id: 'post' | 'story' | 'reel' | 'text';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  iconColor: string;
}

const CONTENT_TYPES: ContentTypeCard[] = [
  {
    id: 'post',
    name: 'Post',
    description: 'Share an image or video to your feed',
    icon: ImageIcon,
    colorClass: 'bg-purple-500/15 border-purple-550/20 text-purple-400',
    iconColor: 'purple'
  },
  {
    id: 'story',
    name: 'Story',
    description: 'Share moments that disappear in 24h',
    icon: Sparkles,
    colorClass: 'bg-amber-500/15 border-amber-550/20 text-amber-400',
    iconColor: 'amber'
  },
  {
    id: 'reel',
    name: 'Reel',
    description: 'Post short video compilations',
    icon: Video,
    colorClass: 'bg-rose-500/15 border-rose-550/20 text-rose-400',
    iconColor: 'rose'
  },
  {
    id: 'text',
    name: 'Text post',
    description: 'Compose thoughts & links directly',
    icon: Type,
    colorClass: 'bg-blue-500/15 border-blue-550/20 text-blue-400',
    iconColor: 'blue'
  }
];

interface CreatePickerBottomSheetProps {
  onSelectType: (type: 'post' | 'story' | 'reel' | 'text' | 'live') => void;
  onClose: () => void;
}

export function CreatePickerBottomSheet({ onSelectType, onClose }: CreatePickerBottomSheetProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col justify-end pointer-events-auto h-screen justify-end">
      
      {/* Tap backdrop to exit */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-[6px] transition-opacity duration-300 z-0"
      />

      {/* Actual Sliding Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative z-10 w-full max-w-lg mx-auto bg-neutral-950/95 border-t border-white/10 rounded-t-[40px] px-6 pb-12 pt-4 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col pointer-events-auto"
      >
        {/* Top Drag Handle Bar */}
        <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer hover:bg-white/30 transition-colors" onClick={onClose} />

        {/* Create Heading row */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-left">
            <h2 className="text-lg font-display font-black tracking-widest text-white uppercase">Transmit Mode</h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Choose channels to broadcast ideas</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2x2 Grid of Content Cards */}
        <div className="grid grid-cols-2 gap-4">
          {CONTENT_TYPES.map((type) => {
            const IconComponent = type.icon;
            return (
              <div
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className="group p-5 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:bg-white/[0.04] hover:border-white/15 transition-all text-left flex flex-col items-start gap-3.5 dynamic-bounce hover:scale-[1.02]"
              >
                {/* Colored icon (rounded square) */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${type.colorClass}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors">{type.name}</h4>
                  <p className="text-[9px] text-white/35 mt-1 leading-normal uppercase-none select-none tracking-normal font-medium">{type.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Below Grid: Go Live row */}
        <div 
          onClick={() => onSelectType('live')}
          className="mt-6 p-5 bg-gradient-to-r from-red-600/5 to-transparent border border-white/5 rounded-3xl cursor-pointer hover:border-red-500/20 hover:from-red-600/10 transition-all flex items-center justify-between group dynamic-bounce"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-400 flex items-center justify-center relative">
              <Activity className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-red-400 transition-colors">Go Live</h4>
              <p className="text-[9px] text-white/35 mt-0.5 leading-normal uppercase-none tracking-normal font-medium">Broadcast real-time video to core members</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </div>

      </motion.div>

    </div>
  );
}
