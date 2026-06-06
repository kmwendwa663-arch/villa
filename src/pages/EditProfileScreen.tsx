import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ChevronLeft, Camera, Loader2, Check } from 'lucide-react';

export function EditProfileScreen() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  const [coverColor, setCoverColor] = useState('#121212');
  
  const [saving, setSaving] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      // Fallback username to email prefix if not set
      const defaultUsername = profile.username || (profile.email ? profile.email.split('@')[0] : 'user');
      setUsername(defaultUsername);
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setLocation(profile.location || '');
      setIsPrivate(profile.isPrivate || false);
      setPhotoURL(profile.photoURL || '');
      setCoverColor(profile.coverColor || '#121212');
    }
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    if (!name.trim()) {
      alert('Display Name is required.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
        isPrivate,
        photoURL,
        coverColor
      });
      navigate(-1);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save profile. Please check permissions / connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = () => {
    const url = window.prompt('Enter new Avatar Image URL', photoURL);
    if (url !== null) {
      setPhotoURL(url.trim());
    }
  };

  const handleChangeCoverColor = () => {
    const color = window.prompt('Enter cover color (Name/HEX, e.g., #b45309)', coverColor);
    if (color !== null) {
      setCoverColor(color.trim());
    }
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  // Generate Initials
  const getInitials = () => {
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return 'ME';
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      {/* Top Header/Navigation Bar */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-[#070707]/90 py-4 border-b border-white/5 backdrop-blur-3xl px-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-xs font-display font-black text-white uppercase tracking-[0.25em]">
          Edit Profile
        </h1>

        <button
          onClick={() => handleSave()}
          disabled={saving || !name.trim()}
          className="text-[10px] font-black uppercase tracking-wider text-gold-500 hover:text-gold-400 disabled:opacity-35 cursor-pointer active:scale-95 transition-all"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center relative py-6">
          <div className="relative group cursor-pointer" onClick={handleChangePhoto}>
            <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-tr from-gold-600/30 to-gold-400/20 opacity-100 group-hover:opacity-100 transition-opacity blur" />
            
            {photoURL ? (
              <img 
                src={photoURL} 
                alt="Profile Avatar" 
                className="relative w-28 h-28 rounded-[32px] object-cover ring-4 ring-black shadow-xl"
              />
            ) : (
              <div className="relative w-28 h-28 rounded-[32px] ring-4 ring-black shadow-xl bg-gradient-to-tr from-gold-600 to-amber-500/80 flex items-center justify-center text-3xl font-black text-black">
                {getInitials()}
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleChangePhoto}
            className="mt-4 text-[9px] font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 cursor-pointer"
          >
            Change Photo
          </button>
        </div>

        {/* Cover Color Selector Block Preview */}
        <div className="p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Cover Profile Style</h4>
            <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Custom cover visual or color backing</p>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg border border-white/10"
              style={{ backgroundColor: coverColor }}
            />
            <button
              type="button"
              onClick={handleChangeCoverColor}
              className="text-[9px] font-black uppercase tracking-widest px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5"
            >
              Modify Color
            </button>
          </div>
        </div>

        {/* Form Input fields */}
        <div className="space-y-5">
          {/* Display Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name or alias"
              className="glass-input w-full px-5 py-4 text-sm font-medium border-none rounded-xl"
              required
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-5 text-sm font-black text-gold-500/50 select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                className="glass-input w-full pl-10 pr-5 py-4 text-sm font-medium border-none rounded-xl"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other collective members about yourself..."
              rows={4}
              className="glass-input w-full px-5 py-4 text-sm font-medium border-none rounded-xl resize-none"
            />
          </div>

          {/* Website */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="glass-input w-full px-5 py-4 text-sm font-medium border-none rounded-xl"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Berlin, Tokyo, Lost in Space"
              className="glass-input w-full px-5 py-4 text-sm font-medium border-none rounded-xl"
            />
          </div>
        </div>

        {/* Divider & Account toggle */}
        <div className="h-[1px] bg-white/5 my-4" />

        <div className="flex items-center justify-between p-5 rounded-2xl glass border border-white/5 bg-black/20">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Private Account</h3>
            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Restrict profile visibility to matched followers only</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer ${
              isPrivate ? 'bg-gold-500' : 'bg-white/10'
            }`}
          >
            <div 
              className={`w-4.5 h-4.5 rounded-full bg-black shadow-md transition-transform duration-300 transform ${
                isPrivate ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Full-width save button */}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-gold w-full py-5 rounded-[20px] shadow-lg flex items-center justify-center gap-2 border-none cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="uppercase tracking-[0.2em] font-black">Updating Channel...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span className="uppercase tracking-[0.2em] font-black">Save Changes</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
