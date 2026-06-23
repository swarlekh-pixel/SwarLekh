import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiSignIn, apiSignUp, apiSignOut } from '@/lib/api';

const USER_CACHE_KEY = 'swarlekh_user';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  roll_number: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: { token: string } | null;
  loading: boolean;
  userRole: 'teacher' | 'student' | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: 'teacher' | 'student',
    rollNumber?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Load from cache instantly — no network call needed
        const [cachedUser, cachedToken] = await Promise.all([
          AsyncStorage.getItem(USER_CACHE_KEY),
          AsyncStorage.getItem('swarlekh_token'),
        ]);

        if (!mounted) return;

        if (cachedUser && cachedToken) {
          const parsed: UserProfile = JSON.parse(cachedUser);
          setUser(parsed);
          setSession({ token: cachedToken });
        }
      } catch {
        // Cache read failed — treat as logged out
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { user: me, token, error } = await apiSignIn(email.trim().toLowerCase(), password);
      if (error) return { error: error as Error };
      if (me && token) {
        setUser(me);
        setSession({ token });
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(me));
      }
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'teacher' | 'student',
    rollNumber?: string
  ) => {
    try {
      const { user: me, token, error } = await apiSignUp(
        email.trim().toLowerCase(), password, name, role, rollNumber
      );
      if (error) return { error: error as Error };
      if (me && token) {
        setUser(me);
        setSession({ token });
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(me));
      }
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    await Promise.all([
      apiSignOut(),
      AsyncStorage.removeItem(USER_CACHE_KEY),
    ]);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole: user?.role ?? null,
        signIn,
        signUp,
        signOut,
      }}
    >
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
