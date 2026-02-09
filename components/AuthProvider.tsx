'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (params: { email: string; password: string; emailRedirectTo?: string }) => ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>['auth']['signUp']
  >;
  signInWithPassword: (params: { email: string; password: string }) => ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>['auth']['signInWithPassword']
  >;
  resetPasswordForEmail: (email: string, redirectTo?: string) => ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>['auth']['resetPasswordForEmail']
  >;
  updatePassword: (password: string) => ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>['auth']['updateUser']
  >;
  signOut: () => ReturnType<ReturnType<typeof createSupabaseBrowserClient>['auth']['signOut']>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signUp: (params: { email: string; password: string; emailRedirectTo?: string }) =>
        supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: params.emailRedirectTo
            ? { emailRedirectTo: params.emailRedirectTo }
            : undefined,
        }),
      signInWithPassword: (params: { email: string; password: string }) =>
        supabase.auth.signInWithPassword(params),
      resetPasswordForEmail: (email: string, redirectTo?: string) =>
        supabase.auth.resetPasswordForEmail(
          email,
          redirectTo ? { redirectTo } : undefined
        ),
      updatePassword: (password: string) =>
        supabase.auth.updateUser({ password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [user, session, isLoading, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
