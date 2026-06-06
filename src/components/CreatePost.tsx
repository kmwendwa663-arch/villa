import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Image, Send, Tag, X, Sparkles, Check, Link as LinkIcon, Upload } from 'lucide-react';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { POST_CATEGORIES, PostCategory } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ImagePreset {
  id: string;
  url: string;
  name: string;
  category: string;
}

const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'arch-1',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    name: 'Brutalist Mansion',
    category: 'Architecture'
  },
  {
    id: 'arch-2',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    name: 'Sunlit Glass Villa',
    category: 'Architecture'
  },
  {
    id: 'arch-3',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    name: 'Metropolis Lines',
    category: 'Architecture'
  },
  {
    id: 'design-1',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
    name: 'Fluid Golden Sand',
    category: 'Design'
  },
  {
    id: 'design-2',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    name: 'Minimalist Wave Art',
    category: 'Design'
  },
  {
    id: 'design-3',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    name: 'Monochrome Texture',
    category: 'Design'
  },
  {
    id: 'nature-1',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    name: 'Golden Shoreline',
    category: 'Nature'
  },
  {
    id: 'nature-2',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    name: 'Misty Alpine Woods',
    category: 'Nature'
  },
  {
    id: 'nature-3',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    name: 'Sun-drenched Leaf',
    category: 'Nature'
  },
  {
    id: 'luxury-1',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    name: 'Retro Vinyl Elegance',
    category: 'Luxury'
  },
  {
    id: 'luxury-2',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    name: 'Gilded Details',
    category: 'Luxury'
  },
  {
    id: 'luxury-3',
    url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=800&q=80',
    name: 'Curated Lounge Interior',
    category: 'Luxury'
  },
];

const PRESET_CATEGORIES = ['All', 'Architecture', 'Design', 'Nature', 'Luxury'];

export function CreatePost() {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageCategoryFilter, setImageCategoryFilter] = useState<string>('All');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [brokenPresetIds, setBrokenPresetIds] = useState<Set<string>>(new Set());

  // Local photo upload & drag and drop support
  const [imageSourceMode, setImageSourceMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreviewImageError(false);
  }, [selectedImageUrl]);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG/JPG/WEBP).');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setSelectedImageUrl(compressedDataUrl);
          setShowImageSelector(false); // seamless user feedback
        }
      };
      img.onerror = () => {
        setError('Failed to process image file. It might be corrupted.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read status of image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = content.trim();
    if (!profile || (!cleanContent && !selectedImageUrl) || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: cleanContent,
        category,
        imageUrl: selectedImageUrl || null,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
      });
      setContent('');
      setCategory('General');
      setSelectedImageUrl(null);
      setShowCategoryPicker(false);
      setShowImageSelector(false);
      setCustomUrlInput('');
      setImageSourceMode('preset');
    } catch (err: any) {
      console.error('Error creating post', err);
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPresets = imageCategoryFilter === 'All'
    ? IMAGE_PRESETS
    : IMAGE_PRESETS.filter(img => img.category === imageCategoryFilter);

  const visiblePresets = filteredPresets.filter(preset => !brokenPresetIds.has(preset.id));

  if (!profile) return null;

  return (
    <div className="bg-transparent">
      <div className="flex gap-5">
        <img 
          src={profile.photoURL} 
          alt={profile.displayName} 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-white/10 shadow-lg"
          referrerPolicy="no-referrer"
        />
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an inspiration..."
            className="w-full bg-transparent border-none focus:ring-0 text-xl font-light resize-none min-h-[120px] text-white placeholder:text-white/20 selection:bg-gold-500/30"
          />

          {/* Current Attached Image Preview */}
          {selectedImageUrl && (
            <div className={cn(
              "relative mb-6 rounded-2xl overflow-hidden border group max-h-[220px] flex items-center justify-center bg-white/2 animate-in fade-in zoom-in-95 duration-500",
              previewImageError ? "border-rose-500/50 bg-rose-950/10" : "border-gold-500/30"
            )}>
              {!previewImageError ? (
                <img 
                  src={selectedImageUrl} 
                  alt="Selected post illustration" 
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewImageError(true)}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-rose-400 gap-2 w-full h-44">
                  <X className="w-8 h-8 text-rose-500 stroke-[3]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Unreachable Image URL</span>
                  <p className="text-[9px] text-white/40 normal-case font-medium">This picture link is broken or blocking external preview. Try another image link.</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedImageUrl(null)}
                  className="px-4 py-2 bg-rose-600/90 border border-rose-500/30 rounded-xl text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] pointer-events-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Image
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowImageSelector(!showImageSelector);
                      setShowCategoryPicker(false);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all duration-300",
                      showImageSelector 
                        ? "bg-gold-500/20 border-gold-500 text-gold-500 shadow-[0_0_15px_rgba(197,160,89,0.15)]" 
                        : "border-transparent text-white/20 hover:text-gold-500 hover:bg-white/5"
                    )}
                    title="Choose preset picture"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCategoryPicker(!showCategoryPicker);
                      setShowImageSelector(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border duration-300",
                      showCategoryPicker ? "bg-gold-500/20 border-gold-500 text-gold-500 shadow-[0_0_15px_rgba(197,160,89,0.15)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                    )}
                  >
                    <Tag className="w-4 h-4" />
                    <span className="uppercase tracking-widest">{category}</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={(!content.trim() && !selectedImageUrl) || isSubmitting}
                  className="btn-gold px-8 py-3 rounded-2xl text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span className="tracking-widest uppercase">Post</span>
                </button>
              </div>

              {/* Category Picker Panel */}
              {showCategoryPicker && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {POST_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                        category === cat 
                          ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20 font-black" 
                          : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Elegant Image Preset Picker Drawer */}
              {showImageSelector && (
                <div className="p-4 rounded-[24px] glass border border-white/5 bg-white/[0.02] animate-in slide-in-from-top-3 fade-in duration-300 flex flex-col gap-4">
                  
                  {/* Mode Tabs */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setImageSourceMode('preset')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 border",
                          imageSourceMode === 'preset'
                            ? "bg-gold-500/20 border-gold-500/30 text-gold-500"
                            : "bg-white/2 border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceMode('upload')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 border flex items-center gap-1",
                          imageSourceMode === 'upload'
                            ? "bg-gold-500/20 border-gold-500/30 text-gold-500"
                            : "bg-white/2 border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceMode('url')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 border flex items-center gap-1",
                          imageSourceMode === 'url'
                            ? "bg-gold-500/20 border-gold-500/30 text-gold-500"
                            : "bg-white/2 border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Custom URL</span>
                      </button>
                    </div>

                    {/* Presets sub-category filters if on 'preset' mode */}
                    {imageSourceMode === 'preset' && (
                      <div className="flex items-center gap-1 max-w-full overflow-x-auto select-none custom-scrollbar pb-0.5">
                        {PRESET_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setImageCategoryFilter(cat)}
                            className={cn(
                              "px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all duration-300 shrink-0",
                              imageCategoryFilter === cat
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Render Presets Grid, Upload Zone, or Custom Input Panel */}
                  {imageSourceMode === 'upload' ? (
                    <div className="flex flex-col gap-3 py-2 animate-in fade-in duration-300">
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 min-h-[140px]",
                          isDragging 
                            ? "border-gold-500 bg-gold-500/10 text-gold-400 scale-[0.99] shadow-[0_0_20px_rgba(197,160,89,0.15)]" 
                            : "border-white/10 hover:border-gold-500/30 hover:bg-white/5 bg-white/[0.01]"
                        )}
                      >
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                          accept="image/*"
                          className="hidden"
                        />
                        <Upload className={cn("w-8 h-8 mb-2.5 transition-all duration-300", isDragging ? "text-gold-500 scale-110" : "text-white/20")} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-white">Upload from Computer</span>
                        <p className="text-[9px] text-white/40 mt-1 max-w-[240px] leading-relaxed">
                          Drag & drop your picture here, or <span className="text-gold-500 underline font-semibold">browse</span> files. Supports JPG, PNG, WEBP.
                        </p>
                      </div>
                    </div>
                  ) : imageSourceMode === 'url' ? (
                    <div className="flex flex-col gap-3 py-2 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customUrlInput.trim()) {
                                setSelectedImageUrl(customUrlInput.trim());
                                setShowImageSelector(false);
                              }
                            }
                          }}
                          placeholder="Paste direct image link (e.g. https://...)"
                          className="flex-1 glass-input bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customUrlInput.trim()) {
                              setSelectedImageUrl(customUrlInput.trim());
                              setShowImageSelector(false);
                            }
                          }}
                          className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shrink-0 font-bold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Attach</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-white/30 italic">
                        Tip: You can paste any direct web image URL to share it.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[190px] overflow-y-auto pr-1 select-none custom-scrollbar py-1">
                      {visiblePresets.map(preset => {
                        const isSelected = selectedImageUrl === preset.url;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              setSelectedImageUrl(isSelected ? null : preset.url);
                              setShowImageSelector(false); // Close drawer on selection for seamless user flow
                            }}
                            className={cn(
                              "relative aspect-video rounded-xl overflow-hidden cursor-pointer border group/item transition-all duration-300",
                              isSelected 
                                ? "border-gold-500 ring-2 ring-gold-500/30 ring-offset-2 ring-offset-black scale-95" 
                                : "border-white/5 hover:border-white/30 hover:scale-[1.03]"
                            )}
                            title={preset.name}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              referrerPolicy="no-referrer"
                              onError={() => setBrokenPresetIds(prev => {
                                const next = new Set(prev);
                                next.add(preset.id);
                                return next;
                              })}
                              className="w-full h-full object-cover grayscale-[30%] group-hover/item:grayscale-0 transition-all duration-500"
                            />
                            {/* Inner Name Badge */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-[8px] font-medium tracking-tight text-white block truncate">
                                {preset.name}
                              </span>
                            </div>
                            {/* Selected Check overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-gold-500/15 flex items-center justify-center">
                                <div className="p-1 rounded-full bg-gold-500 text-black">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
