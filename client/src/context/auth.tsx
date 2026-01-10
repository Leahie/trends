import React, {useState, useMemo, useRef, useEffect, useContext, createContext, useCallback} from 'react';
import type { ReactNode } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import type {User} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

import firebaseConfig from '../firebaseConfig.json';


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

interface AuthContextType {
  user: User | null;
  firstName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType  | undefined>(undefined);
export function AuthProvider({children}: {children : ReactNode}){
    const [user, setUser] = useState<User | null>(null);
    const [firstName, setFirstName] = useState<string>("user");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        
        setLoading(false);
        if(user){
          const token = await user.getIdToken();
          setFirstName(user.displayName?.split(' ')[0] || 'User')
        }
        });
        console.log("user is totally updating",user);
        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return new Promise<void>((resolve, reject) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    unsubscribe();
                    resolve();
                }
                });
                setTimeout(() => {
                unsubscribe();
                reject(new Error('Authentication timeout'));
                }, 5000);
            });
            } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new Error('No account found with this email');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Incorrect password');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email address');
            } else if (error.code === 'auth/user-disabled') {
                throw new Error('This account has been disabled');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Too many failed attempts. Please try again later');
            } else if (error.code === 'auth/invalid-credential') {
                throw new Error('Invalid email or password');
            }
            throw error;
            }
    };

    const signUp = async (email: string, password: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            await sendEmailVerification(userCredential.user)

            // Wait for auth state to update
            return new Promise<void>((resolve, reject) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    unsubscribe();
                    resolve();
                }
                });
                // Timeout after 5 seconds
                setTimeout(() => {
                unsubscribe();
                reject(new Error('Authentication timeout'));
                }, 5000);
            });
            } catch (error: any) {
            // Handle specific Firebase auth errors
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('This email is already registered');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Password must be at least 6 characters');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email address');
            }
            throw error;
            }
    };

    const signInWithGoogle = async () => {
        try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Wait for auth state to update
      return new Promise<void>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve();
          }
        });
        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Authentication timeout'));
        }, 5000);
      });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in was cancelled');
      }
      throw error;
    }
    };

    const logOut = async () => {
        await signOut(auth);
        setUser(null);
    };

    const getIdToken = async (): Promise<string | null> => {
        if (!user) return null;
        try {
        return await user.getIdToken();
        } catch (error) {
        console.error('Failed to get ID token:', error);
        // If token refresh fails, sign out the user
        await logOut();
        return null;
        }
    };
    return (
        <AuthContext.Provider value = {{user, firstName, loading, signIn, signUp, signInWithGoogle, logOut, getIdToken}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}