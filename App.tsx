import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import Header from './components/Header';
import FranchiseProcessGuide from './components/FranchiseProcessGuide';
import Login from './components/Login';
import AIAssistant from './components/AIAssistant';
import AdminDashboard from './components/AdminDashboard';
import { STEPS } from './constants';
import { User, CustomTask } from './types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

// Existing ErrorBoundary code remains...
// (I will keep it in the replacement chunk to ensure a clean swap)

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(public props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-gray-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-center h-16 w-16 bg-red-900/20 border-2 border-red-600 rounded-full mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-6 text-sm">
              The application encountered an unexpected error. This might be due to a connection issue or a configuration problem.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsUnauthorized(false);
      
      if (user) {
        const userEmail = user.email?.toLowerCase().trim();
        const userDocRef = doc(db, 'users', user.uid);
        const emailDocRef = userEmail ? doc(db, 'users', userEmail) : null;
        
        let userDoc = await getDoc(userDocRef);
        
        // 1. Check for a pre-authorized "Shell" document (ID is their email)
        if (!userDoc.exists() && emailDocRef) {
          const emailDoc = await getDoc(emailDocRef);
          
          if (emailDoc.exists()) {
            // ADOPT! Move data from email-doc to uid-doc
            const data = emailDoc.data();
            const adoptedProfile: User = {
              ...data,
              id: user.uid,
              role: data.role || 'franchisee'
            } as User;
            
            await setDoc(userDocRef, adoptedProfile);
            
            // Note: We don't delete the email doc immediately to avoid rule complexities, 
            // but the user now has a real UID-based profile.
            userDoc = await getDoc(userDocRef);
          }
        }
        
        if (!userDoc.exists()) {
          // Final check: Is this Jacob?
          if (user.email === 'jacob@creationcoffee.co') {
            const userData: User = { 
              id: user.uid,
              name: user.displayName || 'Jacob Spence', 
              email: user.email || '',
              role: 'admin'
            };
            await setDoc(userDocRef, userData);
            setCurrentUser(userData);
            setIsAdminView(true);
            setLoading(false);
          } else {
            setIsUnauthorized(true);
            await signOut(auth);
            setLoading(false);
          }
          return;
        }

        const userData = { id: user.uid, ...userDoc.data() } as User;
        setCurrentUser(userData);
        if (userData.role === 'admin') setIsAdminView(true);
      } else {
        setCurrentUser(null);
        setCompletedSteps(new Set());
        setCompletedTasks(new Set());
        setIsAdminView(false);
        setImpersonatedUserId(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to progress for either self or impersonated user
  useEffect(() => {
    const targetUserId = impersonatedUserId || (currentUser?.id);
    if (!targetUserId) {
      if (currentUser === null && !loading) setLoading(false);
      return;
    }

    const path = `user_progress/${targetUserId}`;
    const progressDoc = doc(db, 'user_progress', targetUserId);
    const unsubSnapshot = onSnapshot(progressDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompletedSteps(new Set(data.completed_steps || []));
        setCompletedTasks(new Set(data.completed_tasks || []));
      } else {
        setCompletedSteps(new Set());
        setCompletedTasks(new Set());
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubSnapshot();
  }, [impersonatedUserId, currentUser?.id]);

  const saveProgress = async (steps: number[], tasks: string[]) => {
    const targetUserId = impersonatedUserId || (currentUser?.id);
    if (!targetUserId) return;

    const path = `user_progress/${targetUserId}`;
    try {
      await setDoc(doc(db, 'user_progress', targetUserId), {
        user_id: targetUserId,
        completed_steps: steps,
        completed_tasks: tasks,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleCustomTaskToggle = async (task: CustomTask) => {
    try {
      await updateDoc(doc(db, 'custom_tasks', task.id), {
        completed: !task.completed
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `custom_tasks/${task.id}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleStepComplete = (stepId: number) => {
    const newCompletedSteps = new Set<number>(completedSteps);
    newCompletedSteps.add(stepId);
    setCompletedSteps(newCompletedSteps);

    const stepTasks = STEPS.find(s => s.id === stepId)?.tasks.map(t => t.id) || [];
    const newCompletedTasks = new Set<string>(completedTasks);
    stepTasks.forEach(taskId => newCompletedTasks.add(taskId));
    setCompletedTasks(newCompletedTasks);
    saveProgress(Array.from(newCompletedSteps), Array.from(newCompletedTasks));
  };

  const handleTaskToggle = (taskId: string) => {
    const newCompletedTasks = new Set<string>(completedTasks);
    if (newCompletedTasks.has(taskId)) {
      newCompletedTasks.delete(taskId);
    } else {
      newCompletedTasks.add(taskId);
    }
    setCompletedTasks(newCompletedTasks);
    saveProgress(Array.from(completedSteps), Array.from(newCompletedTasks));
  };

  const totalTasks = STEPS.reduce((total, step) => total + step.tasks.length, 0);
  const progress = totalTasks > 0 ? (completedTasks.size / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="relative">
        <Login />
        {isUnauthorized && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-md">
            <div className="max-w-md w-full bg-gray-900 border border-amber-900/50 rounded-3xl p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-amber-600/20 border-2 border-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Access Denied</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                This dashboard is strictly <span className="text-white font-bold">Invite Only</span>. 
                Your account has not been authorized by our team yet.
              </p>
              <div className="bg-gray-800/50 rounded-2xl p-4 mb-8">
                <p className="text-xs text-gray-500 italic">
                  If you are a Creation Coffee franchisee and should have access, please contact your account manager directly.
                </p>
              </div>
              <button 
                onClick={() => setIsUnauthorized(false)}
                className="w-full py-4 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 uppercase tracking-widest text-sm"
              >
                Go Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 font-sans">
        <Header 
          progress={progress} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          showAdminLink={currentUser.role === 'admin' && !isAdminView}
          onAdminClick={() => {
            setImpersonatedUserId(null);
            setIsAdminView(true);
          }}
        />
        
        <main className="container mx-auto px-4 py-8">
          {currentUser.role === 'admin' && isAdminView && !impersonatedUserId ? (
            <AdminDashboard 
              currentUser={currentUser}
              onImpersonate={(uid) => {
                setImpersonatedUserId(uid);
                setIsAdminView(false);
              }} 
            />
          ) : (
            <>
              {impersonatedUserId && (
                <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-4 mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-600 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-amber-500 font-bold">Admin View Active</p>
                      <p className="text-gray-400 text-sm">You are viewing/managing a franchisee's progress.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setImpersonatedUserId(null);
                      setIsAdminView(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-500 transition-all"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
              
              {currentUser.role === 'admin' && !impersonatedUserId && (
                <div className="mb-8">
                   <button 
                    onClick={() => setIsAdminView(true)}
                    className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-bold rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
                  >
                    Switch to Admin Dashboard
                  </button>
                </div>
              )}

              <FranchiseProcessGuide 
                userId={impersonatedUserId || currentUser.id!}
                completedSteps={completedSteps} 
                onStepComplete={handleStepComplete} 
                completedTasks={completedTasks}
                onTaskToggle={handleTaskToggle}
                onCustomTaskToggle={handleCustomTaskToggle}
              />
            </>
          )}
        </main>

        {!isAdminView && (
          <AIAssistant 
            currentUser={currentUser} 
            completedTasks={completedTasks} 
            progress={progress} 
          />
        )}

        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Creation Coffee Franchising. All rights reserved.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
