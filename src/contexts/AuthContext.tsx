import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, employeeId?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, employeeId?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const userData: { full_name: string; employee_id?: string } = {
      full_name: fullName,
    };

    const normalizedEmployeeId = employeeId?.trim();
    if (normalizedEmployeeId) {
      userData.employee_id = normalizedEmployeeId;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });

    // Best-effort: ensure employee_id is written to profiles even if trigger behavior changes
    if (!error && data?.user && normalizedEmployeeId) {
      try {
        await supabase
          .from('profiles')
          .update({ employee_id: normalizedEmployeeId })
          .eq('id', data.user.id);
      } catch (e) {
        // Ignore here; profile view and Users page will still work, and DB constraint will enforce uniqueness
      }
    }

    if (!error) {
      navigate('/');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!error && data.user) {
      // Log login activity
      try {
        await supabase.from("user_activity_log").insert({
          user_id: data.user.id,
          activity_type: "login",
          description: "User logged in",
          metadata: { timestamp: new Date().toISOString() },
        });
      } catch (logError) {
        console.error("Failed to log login activity:", logError);
      }
      
      navigate('/');
    }
    
    return { error };
  };

  const signOut = async () => {
    // Log logout activity before signing out
    if (user) {
      try {
        await supabase.from("user_activity_log").insert({
          user_id: user.id,
          activity_type: "logout",
          description: "User logged out",
          metadata: { timestamp: new Date().toISOString() },
        });
      } catch (logError) {
        console.error("Failed to log logout activity:", logError);
      }
    }
    
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
