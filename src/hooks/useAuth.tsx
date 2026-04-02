import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: { full_name: string; avatar_url: string; is_active: boolean } | null;
  credits: number;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [credits, setCredits] = useState(0);
  const initialized = useRef(false);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes, creditsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, is_active').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
        supabase.from('credits').select('balance').eq('user_id', userId).single(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) setIsAdmin(roleRes.data.role === 'admin');
      if (creditsRes.data) setCredits(creditsRes.data.balance);
    } catch (e) {
      console.error('Error fetching user data:', e);
    }
  };

  const refreshCredits = async () => {
    if (!user) return;
    const { data } = await supabase.from('credits').select('balance').eq('user_id', user.id).single();
    if (data) setCredits(data.balance);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setCredits(0);
      }
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialized.current) return;
      initialized.current = true;
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, credits, signUp, signIn, signOut, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}
