import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
  business_sector: string;
  services: string[];
  target_audience: string;
  brand_colors: string[];
  logo_url?: string;
  tone_of_voice: string;
  visual_style: string;
}

interface Pack {
  id: string;
  company_id: string;
  pack_type: string;
  monthly_posts_limit: number;
  posts_used: number;
  price: number;
  status: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  pack: Pack | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      if (userData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('company')
          .select('*')
          .eq('id', userData.company_id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);

        const { data: packData, error: packError } = await supabase
          .from('pack')
          .select('*')
          .eq('company_id', userData.company_id)
          .eq('status', 'active')
          .single();

        if (!packError && packData) {
          setPack(packData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setUser(null);
        setCompany(null);
        setPack(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  
  // Charger immédiatement les données user/company/pack
  if (data.user) {
    await loadUserData(data.user.id);
  }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    companyName: string
  ) => {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from signup');

    const userId = authData.user.id;

    try {
      // 2. Create company entry
      const { data: companyData, error: companyError } = await supabase
        .from('company')
        .insert({
          name: companyName,
          business_sector: '',
          services: [],
          target_audience: '',
          brand_colors: [],
          tone_of_voice: '',
          visual_style: '',
        })
        .select()
        .single();

      if (companyError) throw companyError;
      if (!companyData) throw new Error('No company returned from insert');

      const companyId = companyData.id;

      // 3. Create user entry
      const { error: userError } = await supabase
        .from('user')
        .insert({
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          role: 'user',
          company_id: companyId,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 4. Load the user data into context
      await loadUserData(userId);
    } catch (error) {
      // If something goes wrong after auth user is created, we should still clean up
      // For now, we'll just rethrow the error
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCompany(null);
    setPack(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        pack,
        loading,
        signIn,
        signUp,
        signOut,
        refreshData,
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
