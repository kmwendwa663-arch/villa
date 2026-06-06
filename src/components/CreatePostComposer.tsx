import React, { useState, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  Image as ImageIcon, 
  MapPin, 
  Users, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  Sliders, 
  Crop as CropIcon, 
  Smile, 
  Type, 
  Eye, 
  Compass, 
  Check, 
  ArrowLeft, 
  HelpCircle,
  Hash,
  Activity,
  UserPlus,
  Loader2,
  Plus,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, getDocs, serverTimestamp } from '../lib/firebase';
import { POST_CATEGORIES, PostCategory } from '../types';

// Luxury curated mockup photo assets for recent camera roll grid
const CAMERA_ROLL_PHOTOS = [
  { id: 'cam-1', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80', label: 'Bel Air Villa Front' },
  { id: 'cam-2', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80', label: 'Malibu Infinity Poolside' },
  { id: 'cam-3', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80', label: 'Eelegant Salon Room' },
  { id: 'cam-4', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80', label: 'Beach Terraces' },
  { id: 'cam-5', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80', label: 'Brutalist Concrete Arch' },
  { id: 'cam-6', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80', label: 'Minimal Architectural Shadows' },
  { id: 'cam-7', url: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=800&auto=format&fit=crop&q=80', label: 'Cote d\'Azur Dawn' },
  { id: 'cam-8', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', label: 'Turntable Gilded Disc' },
  { id: 'cam-9', url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80', label: 'Calm Monstera Leaf' },
  { id: 'cam-10', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80', label: 'Metropolis Lines' },
  { id: 'cam-11', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80', label: 'Fluid Gold Surface' },
  { id: 'cam-12', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', label: 'Sinuous Wall Art' },
];

const MOCK_LOCATIONS = [
  'Bel Air, Los Angeles',
  'Manhattan Premium Suite, NYC',
  'Malibu Coastline, California',
  'Cote d\'Azur, France',
  'Portofino, Italy',
  'Tokyo Ginza District, Japan',
  'St. Moritz Ski Lodge, Switzerland',
  'Ibiza Beach Club, Spain',
];

const PRESET_HASHTAGS = ['luxury', 'design', 'architecture', 'lifestyle', 'culture', 'vibes', 'inspiration', 'aesthetic'];

interface CreatePostComposerProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function CreatePostComposer({ onClose, onSuccess }: CreatePostComposerProps) {
  const { profile } = useAuth();

  // Step state: 2 => Post Composer (Step 2), 3 => Caption & Details (Step 3)
  const [composerStep, setComposerStep] = useState<2 | 3>(2);

  // STEP 2 CONFIG STATES
  const [activeMediaTab, setActiveMediaTab] = useState<'photo' | 'video' | 'multi'>('photo');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([CAMERA_ROLL_PHOTOS[0].url]);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');
  const [enableMultiSelect, setEnableMultiSelect] = useState(false);

  // EDITING SUITE STATES
  const [activeTool, setActiveTool] = useState<'filter' | 'crop' | 'adjust' | 'sticker' | 'text' | null>(null);
  const [filterStyle, setFilterStyle] = useState<string>('none');
  const [cropFactor, setCropFactor] = useState<string>('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const [photoText, setPhotoText] = useState('');
  const [photoTextColor, setPhotoTextColor] = useState('#ffffff');

  // STEP 3 DETAILS STATES
  const [caption, setCaption] = useState('');
  const [addedHashtags, setAddedHashtags] = useState<string[]>([]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const [showAudienceDialog, setShowAudienceDialog] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<'Everyone' | 'Followers' | 'Only me'>('Everyone');

  const [showTagPeopleDialog, setShowTagPeopleDialog] = useState(false);
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [allUsersMock, setAllUsersMock] = useState<{ uid: string; displayName: string; photoURL: string; username?: string }[]>([]);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);

  const [allowComments, setAllowComments] = useState(true);
  const [crossPostModes, setCrossPostModes] = useState<Record<string, boolean>>({
    Twitter: false,
    Facebook: false,
    Tumblr: false,
  });

  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  // Fetch users for Tag People picker when opened
  React.useEffect(() => {
    if (showTagPeopleDialog) {
      getDocs(collection(db, 'users')).then((snapshot) => {
        const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as any));
        setAllUsersMock(users);
      });
    }
  }, [showTagPeopleDialog]);

  // Compute live highlighted text rendering for Caption (highlighting #tags purple)
  const renderedCaption = useMemo(() => {
    if (!caption) return <span className="text-white/20">Write post description…</span>;
    
    // Split on words to find tags
    const words = caption.split(/(\s+)/);
    return words.map((w, idx) => {
      if (w.startsWith('#') && w.length > 1) {
        return <span key={idx} className="text-purple-400 font-bold">{w}</span>;
      }
      return w;
    });
  }, [caption]);

  // Toggle image selection in roll
  const handlePhotoRollSelect = (url: string) => {
    if (enableMultiSelect || activeMediaTab === 'multi') {
      const isSelected = selectedPhotos.includes(url);
      if (isSelected) {
        if (selectedPhotos.length > 1) {
          setSelectedPhotos(selectedPhotos.filter((p) => p !== url));
        }
      } else {
        if (selectedPhotos.length < 10) {
          setSelectedPhotos([...selectedPhotos, url]);
        }
      }
    } else {
      setSelectedPhotos([url]);
    }
  };

  // Combine adjustments & filters into a cohesive CSS style property object for step 2 preview card
  const getPreviewImageStyle = () => {
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    
    if (filterStyle === 'vivid') filterString += ' saturate-150 contrast-110';
    if (filterStyle === 'retro') filterString += ' sepia-30 hue-rotate-15 contrast-90';
    if (filterStyle === 'noir') filterString += ' grayscale-100 contrast-130 brightness-90';
    if (filterStyle === 'sepia') filterString += ' sepia-100 saturation-90';
    if (filterStyle === 'dramatic') filterString += ' contrast-140 saturate-125';

    return {
      filter: filterString,
    };
  };

  const currentPreviewPhotoUrl = selectedPhotos[0] || CAMERA_ROLL_PHOTOS[0].url;

  // Process and Submit entire compiled feed post
  const handleFinalPublish = async () => {
    if (!profile || isPublishingPost) return;
    setIsPublishingPost(true);

    // Combine any manual tags in caption text plus added pill tags
    const captionTags = caption.match(/#[a-zA-Z0-9]+/g)?.map((t) => t.slice(1).toLowerCase()) || [];
    const mergedTags = Array.from(new Set([...addedHashtags.map((h) => h.toLowerCase()), ...captionTags]));

    // Build sub header location tag etc.
    const cleanCaption = caption.trim();

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: cleanCaption || 'Curator transmission waveband',
        category: 'Lifestyle',
        imageUrl: currentPreviewPhotoUrl,
        mediaUrls: selectedPhotos, // Pass full set of selected photo nodes if multiple
        aspectRatio,
        allowComments,
        audience: selectedAudience,
        location: selectedLocation || null,
        taggedPeople: taggedUserIds,
        tags: mergedTags,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
      });

      onSuccess('Post shared!');
      onClose();
    } catch (err: any) {
      console.error("Posting compile block failed:", err);
    } finally {
      setIsPublishingPost(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-screen overflow-hidden text-white font-sans max-w-lg mx-auto border-x border-white/5 shadow-2xl">
      
      {/* ──────────────────────────────────────────────────────── */}
      {/*                   STEP 2: POST COMPOSER                  */}
      {/* ──────────────────────────────────────────────────────── */}
      {composerStep === 2 && (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
          
          {/* Top header navigation */}
          <div className="p-4 border-b border-white/5 bg-black/95 flex items-center justify-between z-10 shrink-0">
            <button 
              onClick={onClose}
              className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Select Coordinates</h3>
            <button 
              onClick={() => setComposerStep(3)}
              disabled={selectedPhotos.length === 0}
              className={`text-xs uppercase tracking-widest font-black transition-colors ${selectedPhotos.length > 0 ? 'text-purple-400 hover:text-purple-300' : 'text-white/10 pointer-events-none'}`}
            >
              Next
            </button>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="p-3 bg-black flex justify-center border-b border-white/[0.03] space-x-1 shrink-0">
            {(['photo', 'video', 'multi'] as const).map((tab) => {
              const isCur = activeMediaTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveMediaTab(tab);
                    if (tab === 'multi') {
                      setEnableMultiSelect(true);
                    } else {
                      setEnableMultiSelect(false);
                      if (selectedPhotos.length > 1) {
                        setSelectedPhotos([selectedPhotos[0]]);
                      }
                    }
                  }}
                  className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${isCur ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'bg-transparent border-transparent text-white/35 hover:text-white/60'}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Main Display Viewer Frame (Scroller/Container) */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-4">
            
            {/* Aspect Frame Preview Block */}
            <div className="p-4 flex items-center justify-center bg-black/50 shrink-0">
              <div 
                className={`relative w-full overflow-hidden rounded-3xl border border-white/5 bg-zinc-950 flex items-center justify-center transition-all duration-300 ${aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-[16/9]'}`}
              >
                {/* Applied adjust/filters visual styling */}
                <img 
                  src={currentPreviewPhotoUrl} 
                  alt="Post preview frame" 
                  className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-300`} 
                  style={getPreviewImageStyle()}
                  referrerPolicy="no-referrer"
                />

                {/* Overlaid sticker widgets rendering */}
                {activeStickers.map((stk, sidx) => (
                  <motion.div
                    key={sidx}
                    drag
                    dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                    className="absolute text-5xl cursor-grab active:cursor-grabbing z-10"
                    style={{ left: `${30 + (sidx * 15) % 40}%`, top: `${35 + (sidx * 10) % 30}%` }}
                  >
                    {stk}
                  </motion.div>
                ))}

                {/* Overlaid Photo Inscription Text */}
                {photoText.trim() && (
                  <motion.div
                    drag
                    dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                    style={{ color: photoTextColor }}
                    className="absolute z-10 text-center text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-black/60 border border-white/5 backdrop-blur-md cursor-grab active:cursor-grabbing"
                  >
                    {photoText}
                  </motion.div>
                )}

                {/* Left/Right controls overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                  
                  {/* Aspect toggle */}
                  <button 
                    onClick={() => {
                      if (aspectRatio === '1:1') setAspectRatio('4:5');
                      else if (aspectRatio === '4:5') setAspectRatio('16:9');
                      else setAspectRatio('1:1');
                    }}
                    className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white/70 hover:text-white transition-all cursor-pointer pointer-events-auto text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  >
                    <CropIcon className="w-3.5 h-3.5" />
                    <span>{aspectRatio} Aspect</span>
                  </button>

                  {/* Multi-Select Status Layer Indicator */}
                  <button 
                    onClick={() => {
                      setEnableMultiSelect(!enableMultiSelect);
                      if (selectedPhotos.length > 1) setSelectedPhotos([selectedPhotos[0]]);
                    }}
                    className={`p-2.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer pointer-events-auto text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${enableMultiSelect ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/60 border-white/15 text-white/50 hover:text-white'}`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Multi-Frame</span>
                  </button>

                </div>

              </div>
            </div>

            {/* Editing adjustments suite row switcher */}
            <div className="px-4">
              <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar border-b border-white/5">
                {[
                  { id: 'filter', name: 'Filters', icon: Sparkles },
                  { id: 'crop', name: 'Layout Bounds', icon: CropIcon },
                  { id: 'adjust', name: 'Aperture SLT', icon: Sliders },
                  { id: 'sticker', name: 'Sticker Overlay', icon: Smile },
                  { id: 'text', name: 'Overlaid Text', icon: Type },
                ].map((tool) => {
                  const isCur = activeTool === tool.id;
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(activeTool === tool.id ? null : (tool.id as any))}
                      className={`p-3 rounded-2xl border text-center whitespace-nowrap min-w-[100px] flex flex-col items-center gap-1 transition-all cursor-pointer ${isCur ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-extrabold' : 'bg-white/[0.01] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.02]'}`}
                    >
                      <ToolIcon className="w-4 h-4" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">{tool.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editing Tools Drawer Details panels */}
            <AnimatePresence mode="wait">
              {activeTool && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-4 py-2"
                >
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    
                    {/* PANEL: LENS FILTERS */}
                    {activeTool === 'filter' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Atmospheric Filters</span>
                          <button onClick={() => setFilterStyle('none')} className="text-[9px] uppercase tracking-widest text-white/35 hover:text-white">Reset</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'none', label: 'Normal' },
                            { id: 'vivid', label: 'Vivid' },
                            { id: 'retro', label: 'Warm Retro' },
                            { id: 'noir', label: 'Classic Noir' },
                            { id: 'sepia', label: 'Gilded Sepia' },
                            { id: 'dramatic', label: 'Dramatic' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setFilterStyle(f.id)}
                              className={`py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest text-center border transition-all ${filterStyle === f.id ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-transparent border-white/5 text-white/40 hover:text-white'}`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PANEL: CROPS */}
                    {activeTool === 'crop' && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block pb-2 border-b border-white/5">Frame Crop Ratios</span>
                        <div className="grid grid-cols-3 gap-2">
                          {['1:1', '4:5', '16:9'].map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio as any)}
                              className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all ${aspectRatio === ratio ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-transparent border-white/5 text-white/40 hover:text-white'}`}
                            >
                              {ratio} Frame
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PANEL: ADJUST SLIDERS */}
                    {activeTool === 'adjust' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Aperture Adjustments</span>
                          <button 
                            onClick={() => {
                              setBrightness(100);
                              setContrast(100);
                              setSaturation(100);
                            }} 
                            className="text-[9px] uppercase tracking-widest text-white/35 hover:text-white"
                          >
                            Reset
                          </button>
                        </div>

                        {/* Sliders bundle */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/45">
                              <span>Exposures Brightness</span>
                              <span className="font-mono">{brightness}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/45">
                              <span>Contrast Range</span>
                              <span className="font-mono">{contrast}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/45">
                              <span>Color Saturation</span>
                              <span className="font-mono">{saturation}%</span>
                            </div>
                            <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-purple-500" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PANEL: STICKERS */}
                    {activeTool === 'sticker' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Adornment Stamp stickers</span>
                          <button onClick={() => setActiveStickers([])} className="text-[9px] uppercase tracking-widest text-red-400 select-none cursor-pointer">Clear</button>
                        </div>
                        <div className="grid grid-cols-6 gap-3 text-3xl text-center">
                          {['✨', '🔥', '🤍', '🍸', '🕶️', '👑', '🥂', '⚡', '💫', '🌹', '🦋', '🌆'].map((emo) => (
                            <button 
                              key={emo} 
                              onClick={() => setActiveStickers([...activeStickers, emo])} 
                              className="hover:scale-125 hover:rotate-6 active:scale-95 transition-transform"
                            >
                              {emo}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PANEL: PHOTO TEXT */}
                    {activeTool === 'text' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Photo Inscriptions</span>
                          <button onClick={() => setPhotoText('')} className="text-[9px] uppercase tracking-widest text-red-400 select-none cursor-pointer">Clear</button>
                        </div>
                        <input
                          type="text"
                          value={photoText}
                          onChange={(e) => setPhotoText(e.target.value)}
                          placeholder="Type overlay text node..."
                          className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 uppercase tracking-widest"
                        />
                        <div className="flex gap-2 justify-center">
                          {['#ffffff', '#ebb334', '#a855f7', '#3b82f6', '#f43f5e', '#10b981'].map((c) => (
                            <button
                              key={c}
                              onClick={() => setPhotoTextColor(c)}
                              className={`w-5 h-5 rounded-full border border-white/10 ${photoTextColor === c ? 'ring-2 ring-purple-500' : ''}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera Roll grid head */}
            <div className="px-4 shrink-0 flex items-center justify-between mt-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Atmospheric Camera Roll</span>
              <span className="text-[8px] font-mono tracking-widest text-purple-400 uppercase">
                {selectedPhotos.length} / 10 Selected
              </span>
            </div>

            {/* Mini Camera Roll Photos Matrix (3 columns) */}
            <div className="px-4">
              <div className="grid grid-cols-3 gap-2">
                {CAMERA_ROLL_PHOTOS.map((roll, rIdx) => {
                  const selIndex = selectedPhotos.indexOf(roll.url);
                  const isSelected = selIndex >= 0;
                  return (
                    <div 
                      key={roll.id}
                      onClick={() => handlePhotoRollSelect(roll.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border group transition-all duration-350 hover:border-purple-500/40 ${isSelected ? 'border-purple-500 scale-[0.98] ring-2 ring-purple-500/20' : 'border-white/5'}`}
                    >
                      <img src={roll.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
                      
                      {/* Selection order badge code */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-black font-black text-[9px] w-5 h-5 rounded-full border border-black flex items-center justify-center animate-in zoom-in-75 duration-200">
                          {selIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Bottom Activation button Bar */}
          <div className="p-4 border-t border-white/5 bg-black/95 shrink-0">
            <button
              onClick={() => setComposerStep(3)}
              disabled={selectedPhotos.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <span>Verify & Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/*                 STEP 3: CAPTION & DETAILS                 */}
      {/* ──────────────────────────────────────────────────────── */}
      {composerStep === 3 && (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
          
          {/* Top header navigation */}
          <div className="p-4 border-b border-white/5 bg-black/95 flex items-center justify-between z-10 shrink-0">
            <button 
              onClick={() => setComposerStep(2)}
              className="p-1.5 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Review & Publish</h3>
            <button 
              onClick={handleFinalPublish}
              disabled={isPublishingPost}
              className="text-xs uppercase tracking-widest font-black text-purple-400 hover:text-purple-300 transition-colors"
            >
              Post
            </button>
          </div>

          {/* Scrolling Content Block */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-5">
            
            {/* INSCRIBE SECTION: WRITING AREA */}
            <div className="p-4 bg-black/40 border-b border-white/[0.03] space-y-4">
              
              <div className="flex gap-3">
                <img src={profile?.photoURL} alt="" className="w-11 h-11 object-cover rounded-xl border border-white/10 shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-white">@{profile?.displayName.toLowerCase().replace(/\s+/g, '')}</p>
                  
                  {/* Dynamic caption input */}
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 280))}
                    placeholder="Describe this aesthetic frequency to the community…"
                    rows={4}
                    className="w-full bg-transparent border-none text-xs text-white placeholder-white/20 focus:ring-0 resize-none px-0 mt-2 focus:outline-none"
                  />
                </div>

                {/* Micro Thumbnail of selected image */}
                <div className="w-16 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 select-none pointer-events-none">
                  <img src={currentPreviewPhotoUrl} alt="" className="w-full h-full object-cover" style={getPreviewImageStyle()} />
                </div>
              </div>

              {/* Character metrics tracker */}
              <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-white/30 uppercase mt-2">
                <span>Core waveband buffer</span>
                <span>{caption.length} / 280 characters</span>
              </div>

            </div>

            {/* HASHTAG PILLS DRAWER SECTION */}
            <div className="px-4 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Waveband Index Hashtags</span>
              
              <div className="flex flex-wrap gap-2">
                {/* Active tags list */}
                {addedHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setAddedHashtags(addedHashtags.filter((t) => t !== tag))}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-red-500/10 hover:border-red-500/15 hover:text-red-400 transition-all cursor-pointer"
                  >
                    <span>#{tag}</span>
                    <X className="w-3 h-3 group-hover:scale-110" />
                  </button>
                ))}

                {/* Add dynamic new tag pill input form */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="add tag…"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const tagClean = customTagInput.trim().replace('#', '');
                        if (tagClean && !addedHashtags.includes(tagClean)) {
                          setAddedHashtags([...addedHashtags, tagClean]);
                          setCustomTagInput('');
                        }
                      }
                    }}
                    className="bg-[#121212] border border-dashed border-white/10 hover:border-white/25 rounded-xl px-3 py-2 text-[10px] text-white uppercase focus:outline-none focus:border-purple-500 w-24 tracking-widest"
                  />
                </div>
              </div>

              {/* Suggested Presets pill list */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_HASHTAGS.filter((h) => !addedHashtags.includes(h)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setAddedHashtags([...addedHashtags, tag])}
                    className="px-2.5 py-1 rounded-lg bg-white/5 text-[9px] uppercase tracking-widest text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* DETAILS PARAMETERS MULTI LIST */}
            <div className="px-4 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Details Alignment</span>
              
              <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 font-sans">
                
                {/* 1. GEOGRAPHY LOCATION */}
                <div 
                  onClick={() => setShowLocationDialog(true)}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4.5 h-4.5 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Geographic Coordinates</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Add locations to map indices</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">{selectedLocation || 'Set Location'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* 2. AUDIENCE */}
                <div 
                  onClick={() => setShowAudienceDialog(true)}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-4.5 h-4.5 text-blue-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Privacy Audience</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Control post visibility index</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">{selectedAudience}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* 3. TAG OTHER MEMBERS */}
                <div 
                  onClick={() => setShowTagPeopleDialog(true)}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4.5 h-4.5 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tag Member Coordinates</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Inscribe friends with photo markers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                      {taggedUserIds.length > 0 ? `${taggedUserIds.length} Tagged` : 'None Tagged'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* 4. COMMENTS PREFERENCES */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Allow Comment Streams</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Enable discussion waves on this post</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={allowComments} 
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-10 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white border border-white/10" />
                  </label>
                </div>

                {/* 5. MULTI PLATFORM DISTRIBUTION */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Share2 className="w-4.5 h-4.5 text-pink-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cross-Post Distribution</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Sync to external cloud portals</p>
                    </div>
                  </div>

                  {/* Multi buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['Twitter', 'Facebook', 'Tumblr'].map((plat) => {
                      const isActive = crossPostModes[plat];
                      return (
                        <button
                          key={plat}
                          onClick={() => setCrossPostModes({ ...crossPostModes, [plat]: !isActive })}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-center border transition-all ${isActive ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'bg-transparent border-white/5 text-white/35 hover:text-white'}`}
                        >
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* BOTTOM CONFIRM ACTS */}
          <div className="p-4 border-t border-white/5 bg-black/95 shrink-0">
            <button
              onClick={handleFinalPublish}
              disabled={isPublishingPost}
              className="w-full btn-gold py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-xs font-black uppercase tracking-widest shadow-[0_8px_30px_rgba(212,175,55,0.15)] select-none"
            >
              {isPublishingPost ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Sparkles className="w-4 h-4 text-black" />
              )}
              Share Aesthetic Post
            </button>
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/*               OVERLAYS DIALOGS COMPOSITE                 */}
      {/* ──────────────────────────────────────────────────────── */}
      
      {/* DIALOG 1: LOCATION SEARCH */}
      <AnimatePresence>
        {showLocationDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm glass p-6 rounded-3xl border border-white/10 space-y-4 text-center">
              <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em]">GEOGRAPHIC SEARCH</h4>
              
              <input
                type="text"
                autoFocus
                placeholder="Search geographical nodes…"
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-xs text-white uppercase focus:ring-0 focus:outline-none focus:border-amber-500 tracking-widest"
              />

              <div className="space-y-1.5 text-left max-h-[160px] overflow-y-auto no-scrollbar py-1">
                {MOCK_LOCATIONS.filter((loc) => loc.toLowerCase().includes(locationSearchQuery.toLowerCase())).map((matchedLoc) => (
                  <div
                    key={matchedLoc}
                    onClick={() => {
                      setSelectedLocation(matchedLoc);
                      setShowLocationDialog(false);
                      setLocationSearchQuery('');
                    }}
                    className="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs uppercase text-white/75 font-mono">{matchedLoc}</span>
                    <Check className={`w-3.5 h-3.5 text-amber-500 ${selectedLocation === matchedLoc ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setShowLocationDialog(false);
                  }}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  Clear location
                </button>
                <button
                  onClick={() => setShowLocationDialog(false)}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: AUDIENCE PICKER */}
      <AnimatePresence>
        {showAudienceDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm glass p-6 rounded-3xl border border-white/10 space-y-4 text-center">
              <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">ALIGN PRIVACY ACCESS</h4>
              
              <div className="space-y-1 text-left">
                {(['Everyone', 'Followers', 'Only me'] as const).map((aud) => {
                  const isCur = selectedAudience === aud;
                  return (
                    <div
                      key={aud}
                      onClick={() => {
                        setSelectedAudience(aud);
                        setShowAudienceDialog(false);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isCur ? 'bg-blue-500/10 border-blue-500/35 text-white' : 'bg-transparent border-white/5 text-white/50 hover:bg-white/[0.02]'}`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">{aud}</span>
                      <Check className={`w-4 h-4 text-blue-400 ${isCur ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowAudienceDialog(false)}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG 3: TAG PEOPLE */}
      <AnimatePresence>
        {showTagPeopleDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm glass p-6 rounded-3xl border border-white/10 space-y-4 text-center">
              <h4 className="text-purple-400 text-[10px] font-black uppercase tracking-[0.4em]">TAG MEMBERS</h4>
              
              <input
                type="text"
                autoFocus
                placeholder="Search member credentials…"
                value={peopleSearchQuery}
                onChange={(e) => setPeopleSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-xs text-white uppercase focus:ring-0 focus:outline-none focus:border-purple-500 tracking-widest"
              />

              <div className="space-y-1.5 text-left max-h-[180px] overflow-y-auto no-scrollbar py-1">
                {allUsersMock.filter((u) => u.displayName.toLowerCase().includes(peopleSearchQuery.toLowerCase())).map((user) => {
                    const isTagged = taggedUserIds.includes(user.uid);
                    return (
                      <div
                        key={user.uid}
                        onClick={() => {
                          if (isTagged) {
                            setTaggedUserIds(taggedUserIds.filter((id) => id !== user.uid));
                          } else {
                            setTaggedUserIds([...taggedUserIds, user.uid]);
                          }
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={user.photoURL} className="w-7 h-7 rounded-lg object-cover" alt="" />
                          <div>
                            <span className="text-xs uppercase text-white font-mono block">{user.displayName}</span>
                            <span className="text-[8px] text-white/45 uppercase tracking-widest">@{user.username || 'member'}</span>
                          </div>
                        </div>
                        <Check className={`w-3.5 h-3.5 text-purple-400 ${isTagged ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setTaggedUserIds([]);
                    setShowTagPeopleDialog(false);
                  }}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  Clear tags
                </button>
                <button
                  onClick={() => setShowTagPeopleDialog(false)}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
