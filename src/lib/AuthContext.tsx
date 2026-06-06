import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, doc, getDoc, setDoc, serverTimestamp, updateDoc } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  authActionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // Fetch or create profile
          const profileRef = doc(db, 'users', user.uid);
          let profileSnap;
          try {
            profileSnap = await getDoc(profileRef);
          } catch (e) {
            console.error("Error fetching profile, likely rules issue:", e);
          }
          
          if (profileSnap?.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              email: user.email || '',
              createdAt: serverTimestamp(),
            };
            try {
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
            } catch (e) {
              console.error("Error creating profile:", e);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth transformation error:", err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Manage user presence (online/offline heartbeat)
  useEffect(() => {
    if (!user) return;
    
    // 1. Mark online right away
    const markOnline = async () => {
      const profileRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(profileRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.warn("Error marking user online:", err);
      }
    };
    
    markOnline();

    // 2. Set up a heartbeat (every 30 seconds)
    const intervalId = setInterval(async () => {
      const profileRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(profileRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.warn("Error sending heartbeat:", err);
      }
    }, 30000);

    // 3. Handle page visibility changes (mark offline when backgrounded, online when foregrounded)
    const handleVisibilityChange = async () => {
      const profileRef = doc(db, 'users', user.uid);
      try {
        if (document.visibilityState === 'hidden') {
          await updateDoc(profileRef, {
            status: 'offline',
            lastSeen: serverTimestamp()
          });
        } else {
          await updateDoc(profileRef, {
            status: 'online',
            lastSeen: serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("Error updating status on visibility change:", err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Mark offline on beforeunload
    const handleBeforeUnload = () => {
      const profileRef = doc(db, 'users', user.uid);
      try {
        updateDoc(profileRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up by marking offline on unmount/signout
      const profileRef = doc(db, 'users', user.uid);
      try {
        updateDoc(profileRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        // ignore
      }
    };
  }, [user]);

  const signIn = async () => {
    setAuthActionLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Sign in error', error);
      if (error?.code === 'auth/popup-blocked') {
        alert('Please allow popups to sign in to the Villa.');
      } else if (error?.code === 'auth/network-request-failed') {
        alert('Network error. Please check your connection.');
      } else if (error?.code !== 'auth/cancelled-popup-request') {
        alert(`Login failed: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setAuthActionLoading(false);
    }
  };

  const logout = async () => {
    setAuthActionLoading(true);
    try {
      if (user) {
        const profileRef = doc(db, 'users', user.uid);
        try {
          await updateDoc(profileRef, {
            status: 'offline',
            lastSeen: serverTimestamp()
          });
        } catch (e) {
          console.warn("Failed to set status offline on logout:", e);
        }
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setAuthActionLoading(false);
    }
  };


  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(profileRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateProfile, authActionLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
