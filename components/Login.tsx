
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const Logo: React.FC = () => (
    <div className="flex items-center justify-center h-16 w-16 bg-gray-900 border-2 border-amber-600 rounded-full mb-6">
      <span className="text-amber-600 text-4xl font-black" style={{fontFamily: 'serif'}}>C</span>
    </div>
);

const Login: React.FC = () => {
  const [isSignUpView, setIsSignUpView] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Check for invite/setup link parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'true') {
      setIsSignUpView(true);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.message.includes('auth/popup-closed-by-user')) {
        setError(null);
      } else {
        setError("Sign in attempt failed. Please ensure your email is pre-authorized.");
      }
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Incorrect email or password. Only authorized accounts can sign in.");
      setLoading(false);
    }
  };

  const handleAuthorizedSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check if email is whitelisted
      const whitelistedEmail = email.toLowerCase().trim();
      
      // First try: Document ID is the email (New system)
      let userDoc = await getDoc(doc(db, 'users', whitelistedEmail));
      let docRef = doc(db, 'users', whitelistedEmail);

      // Second try: Search for any user with this email (Old system support)
      // Note: In rules, isAdmin() or being the person allowed to self-read is needed.
      // However, here we are unauthenticated.
      // Actually, for backwards compatibility, we might need a query, 
      // but query rules might block it if we aren't careful.
      // Let's assume for now they might just have to be re-added as a lead if the ID doesn't match,
      // OR I can make the lookup more flexible.
      
      if (!userDoc.exists()) {
        setError("Account not found on the whitelist. Please ensure you are using the exact email address you were invited with.");
        setLoading(false);
        return;
      }

      const existingData = userDoc.data();

      // 2. Procced with signup in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // 3. Migrate the pre-authorized doc to the new UID doc
        // This links their "Pre-Auth shell" created by admin to their real UID
        const newUid = userCredential.user.uid;
        await setDoc(doc(db, 'users', newUid), {
          ...existingData,
          id: newUid,
          name: name || existingData.name // Prefer provided name if any
        });
        
        // Delete the temporary email-based doc
        await deleteDoc(doc(db, 'users', whitelistedEmail));
      }

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("An account already exists with this email. Please sign in instead.");
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsSignUpView(!isSignUpView);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/30 p-8 text-center">
            <div className="flex justify-center">
                <Logo />
            </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isSignUpView ? 'Set Access' : 'Owner Portal'}
          </h1>
          <p className="text-gray-400 mb-8 border-b border-gray-800 pb-6 italic text-sm">
            {isSignUpView 
              ? 'Authorized franchisees can configure their secure credentials here.' 
              : <>Restricted access for <span className="text-amber-500 font-bold">Creation Coffee</span> authorized franchisees.</>
            }
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-6 flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 font-bold rounded-xl shadow-md hover:bg-gray-100 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white uppercase tracking-widest text-xs"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSignUpView ? 'Set Up with Google' : 'Sign in with Google'}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gray-900 text-gray-600 uppercase tracking-widest font-black text-[10px]">Secure Credentials</span>
            </div>
          </div>

          <form onSubmit={isSignUpView ? handleAuthorizedSignUp : handleSignIn} className="space-y-4">
            {isSignUpView && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Authorized Email"
              required
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
              aria-label="Email Address"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUpView ? "Choose Access Password" : "Access Password"}
              required
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
              aria-label="Password"
            />

            {error && (
              <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-8 py-4 bg-gray-800 text-white font-bold rounded-xl shadow-md hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 uppercase tracking-widest text-xs"
            >
              {loading ? 'Validating...' : (isSignUpView ? 'Set Password & Access' : 'Access Dashboard')}
            </button>
          </form>

          <p className="mt-8 text-[10px] text-gray-600 leading-relaxed uppercase tracking-tighter">
            {isSignUpView ? 'Already have credentials?' : 'First time here?'}
            <button onClick={toggleView} className="ml-1 font-black text-amber-500 hover:text-amber-400 focus:outline-none focus:underline">
              {isSignUpView ? 'Sign In Instead' : 'Set Up Your Password'}
            </button>
          </p>
        </div>
      </div>
       <footer className="text-center py-8 text-gray-600 text-sm mt-8">
        <p>&copy; {new Date().getFullYear()} Creation Coffee Franchising. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
