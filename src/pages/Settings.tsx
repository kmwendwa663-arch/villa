import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Lock, 
  Shield, 
  Eye, 
  Mail, 
  Phone, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  VolumeX, 
  Ban, 
  HelpCircle, 
  Info, 
  LogOut, 
  Trash2, 
  Check, 
  Clock, 
  Smartphone, 
  Sparkles, 
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  auth
} from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { WallpaperGallery } from '../components/WallpaperGallery';

type SettingsView = 
  | 'main' 
  | 'security' 
  | 'privacy' 
  | 'email-phone' 
  | 'notifications' 
  | 'muted-accounts' 
  | 'blocked-accounts' 
  | 'language' 
  | 'help'
  | 'wallpaper';

export function Settings() {
  const navigate = useNavigate();
  const { profile, logout, updateProfile } = useAuth();

  // Active sub-screen view
  const [activeView, setActiveView] = useState<SettingsView>('main');

  // --- GENERAL APP STATE ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('settings_appearance_dark') !== 'false';
  });

  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('settings_language') || 'English';
  });

  // --- PRIVACY SETTINGS STATE ---
  const [privateAccount, setPrivateAccount] = useState<boolean>(() => profile?.isPrivate || false);
  const [showActivity, setShowActivity] = useState<boolean>(() => {
    const saved = localStorage.getItem('settings_privacy_activity');
    return saved !== 'false';
  });
  const [whoCanComment, setWhoCanComment] = useState<string>(() => {
    return localStorage.getItem('settings_privacy_comment') || 'Everyone';
  });
  const [whoCanMessage, setWhoCanMessage] = useState<string>(() => {
    return localStorage.getItem('settings_privacy_message') || 'Everyone';
  });
  const [whoCanTag, setWhoCanTag] = useState<string>(() => {
    return localStorage.getItem('settings_privacy_tag') || 'Everyone';
  });
  const [hideLikes, setHideLikes] = useState<boolean>(() => {
    return localStorage.getItem('settings_privacy_hidelikes') === 'true';
  });
  const [allowSharing, setAllowSharing] = useState<boolean>(() => {
    return localStorage.getItem('settings_privacy_sharing') !== 'false';
  });

  // --- NOTIFICATIONS SETTINGS STATE ---
  const [notifLikes, setNotifLikes] = useState<boolean>(() => localStorage.getItem('settings_notif_likes') !== 'false');
  const [notifComments, setNotifComments] = useState<boolean>(() => localStorage.getItem('settings_notif_comments') !== 'false');
  const [notifFollowers, setNotifFollowers] = useState<boolean>(() => localStorage.getItem('settings_notif_followers') !== 'false');
  const [notifRequests, setNotifRequests] = useState<boolean>(() => localStorage.getItem('settings_notif_requests') !== 'false');
  const [notifTags, setNotifTags] = useState<boolean>(() => localStorage.getItem('settings_notif_tags') !== 'false');
  const [notifDMs, setNotifDMs] = useState<boolean>(() => localStorage.getItem('settings_notif_dms') !== 'false');
  const [notifMsgRequests, setNotifMsgRequests] = useState<boolean>(() => localStorage.getItem('settings_notif_msgrequests') !== 'false');
  const [notifNews, setNotifNews] = useState<boolean>(() => localStorage.getItem('settings_notif_news') === 'true');
  const [notifSecurity, setNotifSecurity] = useState<boolean>(() => localStorage.getItem('settings_notif_security') !== 'false');
  const [enableQuietHours, setEnableQuietHours] = useState<boolean>(() => localStorage.getItem('settings_notif_quiet') === 'true');
  const [quietHoursStart, setQuietHoursStart] = useState<string>(() => localStorage.getItem('settings_notif_quiet_start') || '22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>(() => localStorage.getItem('settings_notif_quiet_end') || '08:00');

  // --- SECURITY STATE ---
  const [twoFactorToken, setTwoFactorToken] = useState<boolean>(() => localStorage.getItem('settings_security_2fa') === 'true');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');

  // --- CONTACT STATE ---
  const [contactEmail, setContactEmail] = useState(() => profile?.email || '');
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem('settings_contact_phone') || '(+1) 555-0199');
  const [contactMessage, setContactMessage] = useState('');

  // --- REAL-TIME USERS FOR MUITNG / BLOCKING ---
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [blockedUsersRef, setBlockedUsersRef] = useState<string[]>([]);
  const [mutedUsersRef, setMutedUsersRef] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // --- HELP CONCIERGE STATE ---
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // --- DANGER STATE ---
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Synchronize layout dark/light mode class on appearance toggles
  useEffect(() => {
    localStorage.setItem('settings_appearance_dark', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
    }
  }, [darkMode]);

  // Synchronize database isPrivate field on private profile toggle
  useEffect(() => {
    if (profile && privateAccount !== profile.isPrivate) {
      updateProfile({ isPrivate: privateAccount }).catch(err => {
        console.error("Failed to sync private account state:", err);
      });
    }
  }, [privateAccount, profile, updateProfile]);

  // Initialize all external users list
  useEffect(() => {
    if (!profile) return;
    const loadUsersData = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const usersList = snap.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== profile.uid);
        setAllUsers(usersList);
      } catch (e) {
        console.error("Failed to load user records for settings blocks:", e);
      }
    };
    loadUsersData();
  }, [profile]);

  // Read Blocked users dynamically from firestore blocks subcollection
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = onSnapshot(collection(db, 'users', profile.uid, 'blocks'), (snapshot) => {
      setBlockedUsersRef(snapshot.docs.map(doc => doc.id));
    });
    return unsubscribe;
  }, [profile]);

  // Read Muted users dynamically from local storage mutes index
  useEffect(() => {
    const savedMutes = localStorage.getItem('settings_muted_user_ids');
    if (savedMutes) {
      setMutedUsersRef(JSON.parse(savedMutes));
    }
  }, []);

  const handleMuteToggle = (targetUid: string) => {
    let nextMutes = [...mutedUsersRef];
    if (nextMutes.includes(targetUid)) {
      nextMutes = nextMutes.filter(id => id !== targetUid);
    } else {
      nextMutes.push(targetUid);
    }
    setMutedUsersRef(nextMutes);
    localStorage.setItem('settings_muted_user_ids', JSON.stringify(nextMutes));
  };

  const handleBlockToggle = async (targetUid: string) => {
    if (!profile) return;
    const isCurrentlyBlocked = blockedUsersRef.includes(targetUid);
    const targetBlockDoc = doc(db, 'users', profile.uid, 'blocks', targetUid);

    try {
      if (isCurrentlyBlocked) {
        await deleteDoc(targetBlockDoc);
      } else {
        await setDoc(targetBlockDoc, {
          blockedId: targetUid,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Failed to write/delete block documents on Firebase:", e);
    }
  };

  // Safe logout dispatch
  const handleLogoutConfirm = async () => {
    setShowLogOutModal(false);
    await logout();
    navigate('/');
  };

  // Delete profile completely
  const handleDeleteProfileConfirm = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      alert("Please type 'DELETE' to confirm deletion process.");
      return;
    }
    if (!profile) return;
    try {
      setShowDeleteModal(false);
      
      // Delete user's Firestore document
      const userRef = doc(db, 'users', profile.uid);
      await deleteDoc(userRef);
      
      // Attempt to delete auth user (may fail if needs re-auth)
      try {
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
      } catch (authErr) {
        console.warn("Could not delete Auth user directly (requires recent login).", authErr);
      }
      
      alert("Profile and data purged successfully. Disconnecting workspace.");
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Purge account failed:", error);
      alert("Purge operation encountered a credential sync anomaly.");
    }
  };

  // Dynamic values summary labels
  const usernameLabel = profile?.username || (profile?.email ? profile.email.split('@')[0] : 'user');
  const userFullLabel = profile?.displayName || 'Villa Explorer';

  // State saving handlers
  const savePasswordChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setSecurityMessage("Error: New Password and Confirmation must be specified.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage("Error: Passwords do not match.");
      return;
    }
    if (!auth.currentUser) {
      setSecurityMessage("Error: No authenticated secure session detected.");
      return;
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      setSecurityMessage("Premium Secure Passcode registered successfully on the platform!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Firebase update password failed:", error);
      if (error?.code === 'auth/requires-recent-login') {
        setSecurityMessage("Error: Security re-authentication required. Please log out and sign back in to change your passcode.");
      } else {
        setSecurityMessage(`Error: ${error?.message || String(error)}`);
      }
    }
    setTimeout(() => setSecurityMessage(''), 8000);
  };

  const saveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile && contactEmail && contactEmail !== profile.email) {
      updateProfile({ email: contactEmail }).catch(console.error);
    }
    localStorage.setItem('settings_contact_phone', contactPhone);
    setContactMessage("Contact information updated.");
    setTimeout(() => setContactMessage(''), 4000);
  };

  // Helper Row Components
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-500/80 mb-3 ml-1">
      {title}
    </div>
  );

  const Divider = () => (
    <div className="h-px bg-white/5 my-3" />
  );

  interface RowProps {
    icon: React.ComponentType<{ className?: string }>;
    iconBgColor: string;
    title: string;
    subtitle?: string;
    chevron?: boolean;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggleChange?: (val: boolean) => void;
    onClick?: () => void;
    valueLabel?: string;
  }

  const SettingsRow = ({
    icon: Icon,
    iconBgColor,
    title,
    subtitle,
    chevron = true,
    toggle = false,
    toggleValue = false,
    onToggleChange,
    onClick,
    valueLabel
  }: RowProps) => {
    return (
      <div 
        onClick={!toggle && onClick ? onClick : undefined}
        className={`flex items-center justify-between p-3 rounded-xl transition-all ${
          toggle ? 'bg-transparent' : 'hover:bg-white/[0.04] active:scale-[0.99] cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Colored rounded square representing setting categories */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgColor}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
            {subtitle && (
              <p className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5 truncate max-w-[200px] sm:max-w-xs">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {valueLabel && (
            <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest bg-gold-400/10 px-2 py-0.5 rounded border border-gold-400/10">
              {valueLabel}
            </span>
          )}
          {toggle ? (
            <button 
              onClick={() => onToggleChange?.(!toggleValue)}
              className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
                toggleValue ? 'bg-gold-500' : 'bg-white/10 border border-white/10'
              }`}
            >
              <div 
                className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-transform duration-200 ${
                  toggleValue ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/60'
                }`}
              />
            </button>
          ) : (
            chevron && <ChevronRight className="w-4 h-4 text-white/40" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-32">
      
      {/* ───────────────── HEADER NAVBAR ───────────────── */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-[#070707]/90 py-4 border-b border-white/5 backdrop-blur-3xl px-1">
        <button
          onClick={() => {
            if (activeView === 'main') {
              navigate(-1);
            } else {
              setActiveView('main');
            }
          }}
          className="p-2.5 rounded-xl bg-white/[0.03] text-white/50 hover:text-white border border-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-xs font-display font-black text-white uppercase tracking-[0.25em]">
          {activeView === 'main' ? 'App Settings' : `${activeView.replace('-', ' ')}`}
        </h1>

        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ─── MAIN SETTINGS MAIN SCREEN ─── */}
        {activeView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* PROFILE ROW CARD AT TOP */}
            {profile && (
              <div 
                onClick={() => navigate('/edit-profile')}
                className="group relative p-4 rounded-2xl glass-dark border border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur" />
                <div className="flex items-center gap-4 relative min-w-0">
                  {profile.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt="Profile Avatar" 
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gold-500/30 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-600 to-amber-500/80 flex items-center justify-center text-xl font-black text-black flex-shrink-0 leading-none">
                      {userFullLabel.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{userFullLabel}</h3>
                    <p className="text-[10px] text-gold-500/80 font-mono mt-0.5 tracking-widest">@{usernameLabel}</p>
                    <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Concentric Account Space</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 relative group-hover:text-gold-500 transition-colors" />
              </div>
            )}

            {/* ACCOUNT SECTION GRP */}
            <div className="space-y-4">
              <SectionHeader title="Account" />
              <div className="rounded-2xl glass p-1 border border-white/5 whitespace-nowrap">
                <SettingsRow 
                  icon={User} 
                  iconBgColor="bg-blue-600/20 text-blue-400" 
                  title="Edit profile" 
                  subtitle="Manage name, bio, cover visual"
                  onClick={() => navigate('/edit-profile')}
                />
                <Divider />
                <SettingsRow 
                  icon={Lock} 
                  iconBgColor="bg-amber-600/20 text-amber-400" 
                  title="Password & security" 
                  subtitle="Passkey settings & sessions"
                  onClick={() => setActiveView('security')}
                />
                <Divider />
                <SettingsRow 
                  icon={Eye} 
                  iconBgColor="bg-teal-600/20 text-teal-400" 
                  title="Privacy" 
                  subtitle="Toggles, Commenters & Messaging"
                  onClick={() => setActiveView('privacy')}
                />
                <Divider />
                <SettingsRow 
                  icon={Mail} 
                  iconBgColor="bg-indigo-600/20 text-indigo-400" 
                  title="Email & phone" 
                  subtitle="Contact address verification"
                  onClick={() => setActiveView('email-phone')}
                />
              </div>
            </div>

            {/* PREFERENCES SECTION GRP */}
            <div className="space-y-4">
              <SectionHeader title="Preferences" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={Bell} 
                  iconBgColor="bg-pink-600/25 text-pink-400" 
                  title="Notifications" 
                  subtitle="Push, dms & quiet hour timelines"
                  onClick={() => setActiveView('notifications')}
                />
                <Divider />
                <SettingsRow 
                  icon={darkMode ? Moon : Sun} 
                  iconBgColor="bg-purple-600/20 text-purple-400" 
                  title="Appearance" 
                  subtitle="Activate Luxury Dark theme"
                  toggle={true}
                  toggleValue={darkMode}
                  onToggleChange={setDarkMode}
                />
                <Divider />
                <SettingsRow 
                  icon={Globe} 
                  iconBgColor="bg-green-600/20 text-green-400" 
                  title="Language" 
                  subtitle="Select interface lexicon"
                  valueLabel={language}
                  onClick={() => setActiveView('language')}
                />
                <Divider />
                <SettingsRow 
                  icon={ImageIcon} 
                  iconBgColor="bg-yellow-600/25 text-yellow-500" 
                  title="Wallpaper style" 
                  subtitle="Wallpaper settings and custom solid layers"
                  onClick={() => setActiveView('wallpaper')}
                />
              </div>
            </div>

            {/* CONTENT SECTION GRP */}
            <div className="space-y-4">
              <SectionHeader title="Content" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={VolumeX} 
                  iconBgColor="bg-orange-600/20 text-orange-400" 
                  title="Muted accounts" 
                  subtitle="Manage silent conversational profiles"
                  onClick={() => setActiveView('muted-accounts')}
                />
                <Divider />
                <SettingsRow 
                  icon={Ban} 
                  iconBgColor="bg-red-600/20 text-red-400" 
                  title="Blocked accounts" 
                  subtitle="Restrict connection accesses"
                  onClick={() => setActiveView('blocked-accounts')}
                />
              </div>
            </div>

            {/* SUPPORT SECTION GRP */}
            <div className="space-y-4">
              <SectionHeader title="Support" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={HelpCircle} 
                  iconBgColor="bg-sky-600/20 text-sky-400" 
                  title="Help & support" 
                  subtitle="Premium luxury support ticket"
                  onClick={() => setActiveView('help')}
                />
                <Divider />
                <SettingsRow 
                  icon={Info} 
                  iconBgColor="bg-gray-600/20 text-gray-400" 
                  title="About" 
                  subtitle="Version & legal details"
                  valueLabel="v2.4.0-gold"
                  onClick={() => {
                    alert("The Villa Meso Deluxe v2.4.0-gold\n\nCrafted on Cloud Native Workspace Stack. Features real-time Firestore synchronization, high fidelity arpeggio chiming and premium structural dark environments.\n\nEnjoy the luxury, Explorer.");
                  }}
                />
              </div>
            </div>

            {/* DANGER ZONE AT BOTTOM (No border card) */}
            <div className="pt-6 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2 ml-1">
                Danger Zone
              </div>
              
              <button 
                onClick={() => setShowLogOutModal(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-500/10 hover:bg-red-500/[0.04] active:scale-[0.99] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider group-hover:text-red-400">Log out</h4>
                  <p className="text-[9px] text-red-500/50 uppercase tracking-widest mt-0.5">Disconnect from active session</p>
                </div>
              </button>

              <button 
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-500/10 hover:bg-red-500/[0.04] active:scale-[0.99] transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Delete account</h4>
                  <p className="text-[9px] text-red-600/50 uppercase tracking-widest mt-0.5">Permanently remove space and data</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── PRIVACY SETTINGS SCREEN ─── */}
        {activeView === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <SectionHeader title="Account privacy" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={Shield} 
                  iconBgColor="bg-teal-500/20 text-teal-400" 
                  title="Private account" 
                  subtitle="Only accepted followers see your data"
                  toggle={true}
                  toggleValue={privateAccount}
                  onToggleChange={(val) => {
                    setPrivateAccount(val);
                    localStorage.setItem('settings_privacy_private', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Eye} 
                  iconBgColor="bg-blue-500/20 text-blue-400" 
                  title="Show activity status" 
                  subtitle="Allow others to see your active status"
                  toggle={true}
                  toggleValue={showActivity}
                  onToggleChange={(val) => {
                    setShowActivity(val);
                    localStorage.setItem('settings_privacy_activity', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Interactions" />
              <div className="rounded-2xl glass p-4 border border-white/5 space-y-4 whitespace-nowrap">
                {/* Who can comment picker */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Who can comment</h4>
                    <p className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5">Control comment capabilities</p>
                  </div>
                  <select 
                    value={whoCanComment}
                    onChange={(e) => {
                      setWhoCanComment(e.target.value);
                      localStorage.setItem('settings_privacy_comment', e.target.value);
                    }}
                    className="bg-[#121212] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase tracking-wider font-bold focus:outline-none focus:border-gold-500"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Followers">Followers</option>
                    <option value="No one">No one</option>
                  </select>
                </div>

                <Divider />

                {/* Who can message picker */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Who can message you</h4>
                    <p className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5">Control transmissions input</p>
                  </div>
                  <select 
                    value={whoCanMessage}
                    onChange={(e) => {
                      setWhoCanMessage(e.target.value);
                      localStorage.setItem('settings_privacy_message', e.target.value);
                    }}
                    className="bg-[#121212] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase tracking-wider font-bold focus:outline-none focus:border-gold-500"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Followers only">Followers only</option>
                  </select>
                </div>

                <Divider />

                {/* Who can tag picker */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Who can tag you</h4>
                    <p className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5 font-sans">Control post mention linking</p>
                  </div>
                  <select 
                    value={whoCanTag}
                    onChange={(e) => {
                      setWhoCanTag(e.target.value);
                      localStorage.setItem('settings_privacy_tag', e.target.value);
                    }}
                    className="bg-[#121212] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase tracking-wider font-bold focus:outline-none focus:border-gold-500"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Followers">Followers</option>
                    <option value="No one">No one</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Posts" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={Eye} 
                  iconBgColor="bg-amber-500/20 text-amber-400" 
                  title="Hide like counts" 
                  subtitle="Disable public view of like indexes"
                  toggle={true}
                  toggleValue={hideLikes}
                  onToggleChange={(val) => {
                    setHideLikes(val);
                    localStorage.setItem('settings_privacy_hidelikes', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Sparkles} 
                  iconBgColor="bg-indigo-500/20 text-indigo-400" 
                  title="Allow sharing posts" 
                  subtitle="Allow bookmarking & outside links duplication"
                  toggle={true}
                  toggleValue={allowSharing}
                  onToggleChange={(val) => {
                    setAllowSharing(val);
                    localStorage.setItem('settings_privacy_sharing', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Connections" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={Ban} 
                  iconBgColor="bg-red-500/10 text-red-400" 
                  title="Blocked accounts" 
                  subtitle="Manage your blocked lists"
                  onClick={() => setActiveView('blocked-accounts')}
                />
                <Divider />
                <SettingsRow 
                  icon={VolumeX} 
                  iconBgColor="bg-orange-500/10 text-orange-400" 
                  title="Muted accounts" 
                  subtitle="Manage your silenced feed nodes"
                  onClick={() => setActiveView('muted-accounts')}
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── NOTIFICATIONS SETTINGS SCREEN ─── */}
        {activeView === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <SectionHeader title="Push notifications" />
              <div className="rounded-2xl glass p-1 border border-white/5 text-xs text-white font-bold uppercase tracking-wider">
                <SettingsRow 
                  icon={Sparkles} 
                  iconBgColor="bg-amber-500/20 text-gold-500" 
                  title="Likes" 
                  subtitle="Notify when someone likes your broadcast"
                  toggle={true}
                  toggleValue={notifLikes}
                  onToggleChange={(val) => {
                    setNotifLikes(val);
                    localStorage.setItem('settings_notif_likes', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Bell} 
                  iconBgColor="bg-pink-500/20 text-pink-500" 
                  title="Comments" 
                  subtitle="Notify when someone comments on your post"
                  toggle={true}
                  toggleValue={notifComments}
                  onToggleChange={(val) => {
                    setNotifComments(val);
                    localStorage.setItem('settings_notif_comments', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={User} 
                  iconBgColor="bg-teal-500/20 text-teal-400" 
                  title="New followers" 
                  subtitle="Notify when a member begins to follow you"
                  toggle={true}
                  toggleValue={notifFollowers}
                  onToggleChange={(val) => {
                    setNotifFollowers(val);
                    localStorage.setItem('settings_notif_followers', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Shield} 
                  iconBgColor="bg-indigo-500/20 text-indigo-400" 
                  title="Follow requests" 
                  subtitle="Notify of inbound follow approvals requests"
                  toggle={true}
                  toggleValue={notifRequests}
                  onToggleChange={(val) => {
                    setNotifRequests(val);
                    localStorage.setItem('settings_notif_requests', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Clock} 
                  iconBgColor="bg-blue-500/20 text-blue-400" 
                  title="Tags & mentions" 
                  subtitle="Notify when your name is tagged"
                  toggle={true}
                  toggleValue={notifTags}
                  onToggleChange={(val) => {
                    setNotifTags(val);
                    localStorage.setItem('settings_notif_tags', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Messages" />
              <div className="rounded-2xl glass p-1 border border-white/5 text-xs text-white font-bold uppercase tracking-wider">
                <SettingsRow 
                  icon={Clock} 
                  iconBgColor="bg-emerald-500/20 text-emerald-400" 
                  title="Direct messages" 
                  subtitle="Primary inbox incoming message notification"
                  toggle={true}
                  toggleValue={notifDMs}
                  onToggleChange={(val) => {
                    setNotifDMs(val);
                    localStorage.setItem('settings_notif_dms', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Shield} 
                  iconBgColor="bg-purple-500/20 text-purple-400" 
                  title="Message requests" 
                  subtitle="Notify on secondary request queue"
                  toggle={true}
                  toggleValue={notifMsgRequests}
                  onToggleChange={(val) => {
                    setNotifMsgRequests(val);
                    localStorage.setItem('settings_notif_msgrequests', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Email notifications" />
              <div className="rounded-2xl glass p-1 border border-white/5 text-xs text-white font-bold uppercase tracking-wider">
                <SettingsRow 
                  icon={Mail} 
                  iconBgColor="bg-sky-500/20 text-sky-400" 
                  title="News & updates" 
                  subtitle="Receive seasonal newsletters and product updates"
                  toggle={true}
                  toggleValue={notifNews}
                  onToggleChange={(val) => {
                    setNotifNews(val);
                    localStorage.setItem('settings_notif_news', String(val));
                  }}
                />
                <Divider />
                <SettingsRow 
                  icon={Lock} 
                  iconBgColor="bg-red-500/20 text-red-400" 
                  title="Security alerts" 
                  subtitle="Urgent notifications on key sessions activity"
                  toggle={true}
                  toggleValue={notifSecurity}
                  onToggleChange={(val) => {
                    setNotifSecurity(val);
                    localStorage.setItem('settings_notif_security', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Quiet hours" />
              <div className="rounded-2xl glass p-4 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Enable quiet hours</h4>
                    <p className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5 font-sans">Temporarily mute outgoing audio & notifications</p>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !enableQuietHours;
                      setEnableQuietHours(next);
                      localStorage.setItem('settings_notif_quiet', String(next));
                    }}
                    className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
                      enableQuietHours ? 'bg-gold-500' : 'bg-white/10'
                    }`}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full bg-black shadow transform transition-transform duration-200 ${
                        enableQuietHours ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {enableQuietHours && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-3 border-t border-white/5 block space-y-3"
                  >
                    <p className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Timeline Period Schedule</p>
                    <div className="flex items-center gap-4">
                      {/* Quiet hours start schedule */}
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">From (Start Hour)</label>
                        <input 
                          type="time" 
                          value={quietHoursStart} 
                          onChange={(e) => {
                            setQuietHoursStart(e.target.value);
                            localStorage.setItem('settings_notif_quiet_start', e.target.value);
                          }}
                          className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                        />
                      </div>
                      
                      {/* Quiet hours end schedule */}
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">To (End Hour)</label>
                        <input 
                          type="time" 
                          value={quietHoursEnd} 
                          onChange={(e) => {
                            setQuietHoursEnd(e.target.value);
                            localStorage.setItem('settings_notif_quiet_end', e.target.value);
                          }}
                          className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── PASSWORD & SECURITY VIEW ─── */}
        {activeView === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="rounded-2xl glass p-4 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Password Management</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
                Villa authentication uses high-trust secure signin methods. Protect your digital profile space with structured sub-passcodes constraints below.
              </p>

              {securityMessage && (
                <div className="p-3 rounded-xl text-center text-xs font-medium uppercase tracking-wider bg-gold-400/10 text-gold-500 border border-gold-400/20">
                  {securityMessage}
                </div>
              )}

              <form onSubmit={savePasswordChanges} className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                    placeholder="••••••••"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-3 mt-2 text-xs font-black uppercase tracking-widest text-black bg-gradient-to-r from-amber-500 to-gold-500 rounded-xl cursor-pointer hover:from-amber-400 hover:to-gold-400 active:scale-95 transition-all text-center"
                >
                  Save Passcode
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Multi-factor authentication" />
              <div className="rounded-2xl glass p-1 border border-white/5">
                <SettingsRow 
                  icon={Shield} 
                  iconBgColor="bg-teal-500/20 text-teal-400" 
                  title="Two-factor authentication" 
                  subtitle="Secure profile signins with mobile verifications"
                  toggle={true}
                  toggleValue={twoFactorToken}
                  onToggleChange={(val) => {
                    setTwoFactorToken(val);
                    localStorage.setItem('settings_security_2fa', String(val));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Active login sessions" />
              <div className="rounded-2xl glass p-4 border border-white/5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-gold-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Safari on iPhone 15 Pro</h4>
                      <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Active Now • London, UK</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-gold-500 bg-gold-400/10 px-2 py-1 rounded">Primary</span>
                </div>

                <Divider />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">Chrome on macOS Sequoia</h4>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">2 hours ago • Bristol, UK</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert("Session revoked. Session tokens flushed.")}
                    className="text-[8px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── EMAIL & PHONE VIEW ─── */}
        {activeView === 'email-phone' && (
          <motion.div
            key="email-phone"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="rounded-2xl glass p-4 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Contact Validation</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
                Verify and manage your system registration coordinates below to secure your social notifications transmission loops.
              </p>

              {contactMessage && (
                <div className="p-3 rounded-xl text-center text-xs font-medium uppercase tracking-wider bg-gold-400/10 text-gold-500 border border-gold-400/20">
                  {contactMessage}
                </div>
              )}

              <form onSubmit={saveContactInfo} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">Registered Email</label>
                  <input 
                    type="email" 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                    placeholder="name@domain.com"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1.5">Verified Mobile Phone</label>
                  <input 
                    type="text" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                    placeholder="(+1) 500-1000"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-3 mt-2 text-xs font-black uppercase tracking-widest text-black bg-gradient-to-r from-amber-500 to-gold-500 rounded-xl cursor-pointer hover:from-amber-400 hover:to-gold-400 active:scale-95 transition-all text-center"
                >
                  Save Coordinates Style
                </button>
              </form>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── WALLPAPER VIEW ─── */}
        {activeView === 'wallpaper' && (
          <motion.div
            key="wallpaper"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <WallpaperGallery />
            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── LANGUAGE SELECTION VIEW ─── */}
        {activeView === 'language' && (
          <motion.div
            key="language"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="rounded-2xl glass p-1 border border-white/5 overflow-hidden">
              {['English', 'Español (Spanish)', 'Français (French)', 'Deutsch (German)', '日本語 (Japanese)', 'العربية (Arabic)'].map((lang, idx) => {
                const cleanLang = lang.split(' ')[0];
                const isSelected = language === cleanLang;
                return (
                  <div key={idx}>
                    <div 
                      onClick={() => {
                        setLanguage(cleanLang);
                        localStorage.setItem('settings_language', cleanLang);
                      }}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.03] cursor-pointer active:scale-[0.99] transition-all"
                    >
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{lang}</span>
                      {isSelected && <Check className="w-4 h-4 text-gold-500" />}
                    </div>
                    {idx < 5 && <Divider />}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── MUTED ACCOUNTS VIEW ─── */}
        {activeView === 'muted-accounts' && (
          <motion.div
            key="muted"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl glass border border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Muted social nodes</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed mt-1">
                Silenced profiles are omitted from displaying on your home broadcasts feeds timeline, but you remain connected.
              </p>
            </div>

            <div className="relative mb-3">
              <input 
                type="text"
                placeholder="Search accounts to mute..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold-500 uppercase tracking-widest"
              />
            </div>

            <div className="rounded-2xl glass p-1 border border-white/5 space-y-1">
              {allUsers.length === 0 ? (
                <div className="p-8 text-center text-[10px] text-white/30 uppercase tracking-widest">
                  Loading available members list...
                </div>
              ) : (
                allUsers
                  .filter(u => {
                    const disp = u.displayName.toLowerCase();
                    const un = (u.username || '').toLowerCase();
                    return disp.includes(searchFilter.toLowerCase()) || un.includes(searchFilter.toLowerCase());
                  })
                  .map((u, idx) => {
                    const isMuted = mutedUsersRef.includes(u.uid);
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <img 
                              src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                              alt={u.displayName} 
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{u.displayName}</h4>
                              <p className="text-[9px] text-gold-500/80 font-mono mt-0.5">@{u.username || u.displayName.toLowerCase().replace(/\s+/g, '')}</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleMuteToggle(u.uid)}
                            className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border active:scale-95 transition-all text-center cursor-pointer ${
                              isMuted 
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isMuted ? 'Muted' : 'Mute'}
                          </button>
                        </div>
                        {idx < allUsers.length - 1 && <Divider />}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => {
                  if (profile) {
                    setActiveView('main');
                  } else {
                    setActiveView('main');
                  }
                }}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── BLOCKED ACCOUNTS VIEW ─── */}
        {activeView === 'blocked-accounts' && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl glass border border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Blocked profile accesses</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed mt-1">
                Blocked members are restricted from sending messages, commenting, or interacting with your profile coordinates.
              </p>
            </div>

            <div className="relative mb-3">
              <input 
                type="text"
                placeholder="Search accounts to block..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold-500 uppercase tracking-widest"
              />
            </div>

            <div className="rounded-2xl glass p-1 border border-white/5 space-y-1">
              {allUsers.length === 0 ? (
                <div className="p-8 text-center text-[10px] text-white/30 uppercase tracking-widest">
                  Loading available members list...
                </div>
              ) : (
                allUsers
                  .filter(u => {
                    const disp = u.displayName.toLowerCase();
                    const un = (u.username || '').toLowerCase();
                    return disp.includes(searchFilter.toLowerCase()) || un.includes(searchFilter.toLowerCase());
                  })
                  .map((u, idx) => {
                    const isBlocked = blockedUsersRef.includes(u.uid);
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <img 
                              src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                              alt={u.displayName} 
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{u.displayName}</h4>
                              <p className="text-[9px] text-gold-500/80 font-mono mt-0.5">@{u.username || u.displayName.toLowerCase().replace(/\s+/g, '')}</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleBlockToggle(u.uid)}
                            className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border active:scale-95 transition-all text-center cursor-pointer ${
                              isBlocked 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isBlocked ? 'Blocked' : 'Block'}
                          </button>
                        </div>
                        {idx < allUsers.length - 1 && <Divider />}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── HELP & SUPPORT DEUX CONCIERGE ─── */}
        {activeView === 'help' && (
          <motion.div
            key="help"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="p-4 rounded-2xl glass border border-white/5 text-center">
              <h3 className="text-sm font-black bg-gradient-to-r from-amber-400 to-gold-500 bg-clip-text text-transparent uppercase tracking-[0.2em] mb-2 leading-relaxed">
                Villa Deluxe Concierge
              </h3>
              <p className="text-[9px] text-white/50 uppercase tracking-widest leading-relaxed">
                Luxury assistance & FAQ response dispatchers. Dispatched queries are reviewed within 4 premium intervals cycles.
              </p>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Frequently Asked Questions" />
              <div className="space-y-2">
                {[
                  {
                    q: "What is Villa Concierge Space?",
                    a: "Meso Villa represents an exclusive digital domain for architectural presentation, lifestyle expression, elegant design curation, and encrypted luxury network chat transmissions."
                  },
                  {
                    q: "How are blocks and mutes stored?",
                    a: "Mute indexes are saved persistently inside your sandboxed web client localStorage database, whereas blocks write and delete directly onto live secure Google Cloud Firestore database branches."
                  },
                  {
                    q: "How can I update my profile wallpaper?",
                    a: "Wallpaper background profiles can be customized by tapping onto 'Wallpaper Style' under Preferences, or directly modifying preferences at any time."
                  }
                ].map((item, idx) => {
                  const isOpen = faqOpen === idx;
                  return (
                    <div 
                      key={idx}
                      className="rounded-xl border border-white/5 glass-dark overflow-hidden"
                    >
                      <button
                        onClick={() => setFaqOpen(isOpen ? null : idx)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-4 uppercase tracking-wider text-[11px] font-bold text-white hover:bg-white/[0.02] cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronRight className={`w-4 h-4 text-gold-500 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {isOpen && (
                        <div className="p-3.5 bg-white/[0.02] text-[10px] text-white/50 leading-relaxed font-sans border-t border-white/5">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl glass p-4 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Inquire Concierge Agent</h4>
              
              {supportSubmitted ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20 text-gold-500 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-gold-500">Concierge transmission dispatched</h5>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">A bespoke support agent will analyze your coordinates shortly.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSupportSubmitted(false);
                      setSupportMessage('');
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-gold-500 underline py-2 cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
                    Write down of your request, coordinate issues or queries below:
                  </p>
                  <textarea 
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold-500 uppercase tracking-widest"
                    placeholder="Describe your inquiry..."
                  />
                  <button 
                    onClick={async () => {
                      if (!supportMessage.trim() || !profile) return;
                      try {
                        await addDoc(collection(db, 'users', profile.uid, 'support_tickets'), {
                          userId: profile.uid,
                          userEmail: profile.email,
                          displayName: profile.displayName || 'Villa Explorer',
                          message: supportMessage.trim(),
                          createdAt: serverTimestamp(),
                          status: 'open'
                        });
                        setSupportSubmitted(true);
                      } catch (error) {
                        console.error("Failed to transmit concierge ticket:", error);
                        alert("Concierge support queue offline. Please try again.");
                      }
                    }}
                    disabled={!supportMessage.trim()}
                    className="w-full py-3 text-xs font-black uppercase tracking-widest text-black bg-gradient-to-r from-amber-500 to-gold-500 rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    Submit Concierge Ticket
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setActiveView('main')}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 bg-white/[0.03] border border-white/5 rounded-2xl cursor-pointer text-center"
              >
                Return to Settings
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ───────────────── LOGOUT CONFIRMATION MODAL ───────────────── */}
      <AnimatePresence>
        {showLogOutModal && (
          <div className="dialog-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[24px] border border-gold-500/20 glass p-6 space-y-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <LogOut className="w-5 h-5" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Deauthorize session</h3>
                <p className="text-[10px] text-white/50 uppercase tracking-widest leading-relaxed">
                  Are you sure you want to log out? You will need to re-verify your secure credentials to re-enter.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogOutModal(false)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogoutConfirm}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────── DELETE ACCOUNT WARNING DIALOG ───────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="dialog-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[24px] border border-red-500/50 glass p-6 space-y-6 text-center shadow-[0_20px_50px_rgba(239,68,68,0.3)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 animate-pulse">Irreversible Deletion</h3>
                <p className="text-[10px] text-white/60 uppercase tracking-widest leading-relaxed">
                  Warning: Deleting account destroys your live chat transcripts, user nodes credentials and post bookmarks immediately.
                </p>
                <p className="text-[10px] text-gold-500 font-bold uppercase tracking-wider pt-2">
                  Enter "DELETE" below to confirm purge coordinate details:
                </p>
              </div>

              <input 
                type="text" 
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-[#121212] border border-red-500/20 rounded-xl px-3 py-2 text-xs text-center text-white placeholder-white/20 uppercase tracking-widest font-black focus:outline-none focus:border-red-500"
                placeholder="TYPE DELETE HERE"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  Abstaining
                </button>
                <button 
                  onClick={handleDeleteProfileConfirm}
                  disabled={deleteConfirmText.toUpperCase() !== 'DELETE'}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-20 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Purge Space
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
