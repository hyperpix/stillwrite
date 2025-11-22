
import React, { useState } from 'react';
import { Dialog, Button, Input, Label } from './ui/primitives';
import { Icons } from './Icons';
import { User } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose, onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    
    if (!auth) {
        setError("Firebase not configured.");
        setIsLoading(false);
        return;
    }

    try {
        let userCredential;
        if (isSignUp) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        }
        
        const firebaseUser = userCredential.user;
        const appUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        };

        onLogin(appUser);
        onClose();
        setEmail('');
        setPassword('');
    } catch (err: any) {
        console.error(err);
        let msg = "Authentication failed.";
        if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
        if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
        if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        setError(msg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
        setError("Firebase not configured.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const appUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        };
        onLogin(appUser);
        onClose();
    } catch (err: any) {
        console.error(err);
        setError("Google sign in failed.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog 
        isOpen={isOpen} 
        onClose={onClose}
    >
        <div className="flex flex-col items-center gap-2 text-center pt-4 pb-6">
             <div className="flex items-center gap-2 font-bold text-2xl">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icons.GalleryVerticalEnd className="size-4" />
                </div>
                <span>Flow</span>
             </div>
             <p className="text-sm text-muted-foreground">
                {isSignUp ? "Create an account to get started" : "Enter your email below to login to your account"}
             </p>
        </div>

        <div className="grid gap-6">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                        <a href="#" className="ml-auto text-xs underline-offset-4 hover:underline text-muted-foreground">
                            Forgot your password?
                        </a>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <div className="text-xs text-destructive">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />}
                  {isSignUp ? "Sign Up" : "Login"}
                </Button>
              </div>
            </form>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                 <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                    Google
                </Button>
            </div>

            <div className="text-center text-sm">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button 
                    type="button" 
                    className="underline underline-offset-4 hover:text-primary"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? "Login" : "Sign Up"}
                </button>
            </div>
        </div>
    </Dialog>
  );
};
