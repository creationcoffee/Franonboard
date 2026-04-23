import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc, where, orderBy } from 'firebase/firestore';
import { User, CustomTask, Task, ProcessStep, AdminNote, UserStatus, ActivityLog, ActivityType } from '../types';
import { STEPS } from '../constants';

interface AdminDashboardProps {
  onImpersonate?: (userId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onImpersonate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [customTasks, setCustomTasks] = useState<Record<string, CustomTask[]>>({});
  
  // Activity state
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [newActivityContent, setNewActivityContent] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType>('note');
  
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    location: '',
    status: 'potential',
    role: 'franchisee'
  });

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userToInvite, setUserToInvite] = useState<User | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Admin Notes State
  const [currentNote, setCurrentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(doc => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubProgress = onSnapshot(collection(db, 'user_progress'), (snapshot) => {
      const progressMap: Record<string, any> = {};
      snapshot.forEach(doc => {
        progressMap[doc.id] = doc.data();
      });
      setUserProgress(progressMap);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'user_progress'));

    const unsubCustomTasks = onSnapshot(collection(db, 'custom_tasks'), (snapshot) => {
      const tasksMap: Record<string, CustomTask[]> = {};
      snapshot.forEach(doc => {
        const task = { id: doc.id, ...doc.data() } as CustomTask;
        if (!tasksMap[task.userId]) tasksMap[task.userId] = [];
        tasksMap[task.userId].push(task);
      });
      setCustomTasks(tasksMap);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'custom_tasks'));

    return () => {
      unsubUsers();
      unsubProgress();
      unsubCustomTasks();
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setActivities([]);
      return;
    }

    const q = query(
      collection(db, 'activity_logs'),
      where('userId', '==', selectedUserId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: ActivityLog[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setActivities(logs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activity_logs'));

    return () => unsubscribe();
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      const fetchNote = async () => {
        try {
          const noteDoc = await getDoc(doc(db, 'admin_notes', selectedUserId));
          if (noteDoc.exists()) {
            setCurrentNote(noteDoc.data().content);
          } else {
            setCurrentNote('');
          }
        } catch (err) {
          console.error("Error fetching admin notes:", err);
        }
      };
      fetchNote();
    }
  }, [selectedUserId]);

  const handleInvite = (user: User) => {
    setUserToInvite(user);
    setShowInviteModal(true);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      
      // Update invite status and log once they copy the info (suggesting intent to send)
      if (userToInvite?.id) {
        await updateDoc(doc(db, 'users', userToInvite.id), {
          invitedAt: new Date().toISOString()
        });
        
        const logId = `log_${Date.now()}`;
        await setDoc(doc(db, 'activity_logs', logId), {
          userId: userToInvite.id,
          type: 'email',
          content: `Copied dashboard invitation template for ${userToInvite.email}`,
          timestamp: new Date().toISOString(),
          adminId: auth.currentUser?.uid || 'system'
        });
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newActivityContent.trim()) return;

    const logId = `log_${Date.now()}`;
    const newLog: ActivityLog = {
      userId: selectedUserId,
      type: selectedActivityType,
      content: newActivityContent,
      timestamp: new Date().toISOString(),
      adminId: auth.currentUser?.uid || 'system'
    };

    try {
      await setDoc(doc(db, 'activity_logs', logId), newLog);
      setNewActivityContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `activity_logs/${logId}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name) return;

    // Use email as the document ID for pre-authorization
    // This allows us to whitelist them before they ever create an account
    const userId = newUser.email.toLowerCase().trim();
    const userData = {
      ...newUser,
      email: newUser.email.toLowerCase().trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', userId), userData);
      setShowAddForm(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        location: '',
        status: 'potential',
        role: 'franchisee'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this franchisee? All their progress and logs will be lost.')) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Also potentially delete progress and notes, but let's keep it simple for now or do it in rules-compliant way
      if (selectedUserId === userId) setSelectedUserId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveUser = async (userId: string, currentStatus?: string) => {
    const newStatus: UserStatus = currentStatus === 'archived' ? 'potential' : 'archived';
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedUserId) return;
    setSavingNote(true);
    try {
      await setDoc(doc(db, 'admin_notes', selectedUserId), {
        userId: selectedUserId,
        content: currentNote,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `admin_notes/${selectedUserId}`);
    } finally {
      setSavingNote(false);
    }
  };

  const totalTasks = STEPS.reduce((total, step) => total + step.tasks.length, 0);

  const handleAddCustomTask = async (userId: string) => {
    if (!newTaskText.trim()) return;
    
    const taskId = `custom_${Date.now()}`;
    const newTask: CustomTask = {
      id: taskId,
      userId,
      text: newTaskText,
      completed: false,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'custom_tasks', taskId), newTask);
      setNewTaskText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `custom_tasks/${taskId}`);
    }
  };

  const handleToggleCustomTask = async (task: CustomTask) => {
    try {
      await updateDoc(doc(db, 'custom_tasks', task.id), {
        completed: !task.completed
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `custom_tasks/${task.id}`);
    }
  };

  const handleDeleteCustomTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'custom_tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `custom_tasks/${taskId}`);
    }
  };

  const calculateProgress = (userId: string) => {
    const progress = userProgress[userId];
    if (!progress) return 0;
    const completedCount = progress.completed_tasks?.length || 0;
    return totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-white">Franchisee Management</h2>
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border transition-all ${
                  showArchived 
                  ? 'bg-amber-600 border-amber-600 text-white' 
                  : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {showArchived ? 'Showing Archived' : 'Show Archived'}
              </button>
            </div>
            <p className="text-gray-400 mt-1">Manage and track franchisee onboarding progress.</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Potential Franchisee
          </button>
        </div>

        {showAddForm && (
          <div className="mb-10 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">New Potential Franchisee</h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Full Name</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                  placeholder="John Doe"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Email Address</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                  placeholder="john@example.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Phone</label>
                <input 
                  type="tel" 
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Location</label>
                <input 
                  type="text" 
                  value={newUser.location}
                  onChange={(e) => setNewUser({...newUser, location: e.target.value})}
                  placeholder="City, State"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500 transition-all shadow-md shadow-amber-900/20"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users
            .filter(u => showArchived ? u.status === 'archived' : u.status !== 'archived')
            .map(user => (
            <div 
              key={user.id} 
              onClick={() => setSelectedUserId(user.id!)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col ${
                selectedUserId === user.id 
                  ? 'bg-gray-800 border-amber-600 shadow-lg shadow-amber-900/20' 
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center font-bold text-white text-xl flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{user.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              {user.status && (
                <div className="mb-4 flex items-center justify-between">
                  <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded ${
                    user.status === 'potential' ? 'bg-blue-900/40 text-blue-400' :
                    user.status === 'onboarding' ? 'bg-amber-900/40 text-amber-500' :
                    'bg-green-900/40 text-green-500'
                  }`}>
                    {user.status}
                  </span>
                  {user.invitedAt && (
                    <span className="text-[9px] text-gray-500 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Invited
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Progress</span>
                  <span className="text-amber-500 font-bold">{Math.round(calculateProgress(user.id!))}%</span>
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-600 h-full transition-all duration-500" 
                    style={{ width: `${calculateProgress(user.id!)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedUserId && selectedUser && (
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">{selectedUser.name}</h3>
                {selectedUser.location && <span className="text-sm text-gray-500">({selectedUser.location})</span>}
              </div>
              <p className="text-gray-400 font-mono text-sm">{selectedUser.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => handleInvite(selectedUser)}
                className="px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-600/30 font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {selectedUser.invitedAt ? 'Re-Invite' : 'Invite'}
              </button>
              <button 
                onClick={() => onImpersonate?.(selectedUserId)}
                className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 font-bold rounded-lg hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
              <button 
                onClick={() => handleArchiveUser(selectedUserId, selectedUser.status)}
                className="px-4 py-2 bg-gray-800 text-gray-400 border border-gray-700 font-bold rounded-lg hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {selectedUser.status === 'archived' ? 'Restore' : 'Archive'}
              </button>
              <button 
                onClick={() => handleDeleteUser(selectedUserId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/30 font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1: Activity Log & Quick Note */}
            <div className="space-y-6 flex flex-col h-[600px]">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h4 className="text-xl font-bold text-white">Activity Log</h4>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${savingNote ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest">{savingNote ? 'Synced' : 'Synced'}</span>
                </div>
              </div>

              {/* Log Activity Form */}
              <form onSubmit={handleLogActivity} className="bg-gray-800/40 p-4 rounded-xl border border-gray-800 space-y-3">
                <div className="flex gap-2">
                  {(['email', 'call', 'meeting', 'note'] as ActivityType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedActivityType(type)}
                      className={`flex-1 py-1 text-[10px] uppercase font-bold rounded-md border transition-all ${
                        selectedActivityType === type 
                          ? 'bg-amber-600 border-amber-600 text-white' 
                          : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newActivityContent}
                    onChange={(e) => setNewActivityContent(e.target.value)}
                    placeholder={`Log a ${selectedActivityType}...`}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button 
                    type="submit"
                    className="bg-gray-700 px-3 py-2 rounded-lg text-white hover:bg-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </form>
              
              {/* Activity History */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {activities.map((log) => (
                  <div key={log.id} className="relative pl-6 pb-4 border-l border-gray-800 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-700 border-2 border-gray-950"></div>
                    <div className="bg-gray-800/20 p-3 rounded-lg border border-gray-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                          log.type === 'call' ? 'bg-blue-900/30 text-blue-400' :
                          log.type === 'email' ? 'bg-purple-900/30 text-purple-400' :
                          log.type === 'meeting' ? 'bg-green-900/30 text-green-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-[10px] text-gray-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{log.content}</p>
                    </div>
                  </div>
                ))}
                
                {/* Legacy Notes Integration */}
                <div className="pt-4 border-t border-gray-800 mt-4">
                  <label className="text-[10px] uppercase font-black text-gray-600 mb-2 block">Comprehensive Internal Dossier</label>
                  <textarea 
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    onBlur={handleSaveNote}
                    placeholder="Enter private legacy notes..."
                    className="w-full h-32 bg-gray-800/40 border border-gray-800 rounded-xl p-3 text-gray-400 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Custom Tasks Section */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Franchisee To-Do List</h4>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add specific requirement..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <button 
                  onClick={() => handleAddCustomTask(selectedUserId)}
                  className="px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all text-sm"
                >
                  Add
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {customTasks[selectedUserId]?.length ? (
                  customTasks[selectedUserId].map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 group">
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={task.completed} 
                          onChange={() => handleToggleCustomTask(task)}
                          className="w-5 h-5 rounded border-gray-600 text-amber-600 focus:ring-amber-500 bg-gray-700 cursor-pointer"
                        />
                        <span className={`text-sm text-white ${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteCustomTask(task.id)}
                        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 italic bg-gray-800/20 rounded-xl border border-dashed border-gray-700 text-sm">
                    No custom tasks assigned.
                  </div>
                )}
              </div>
            </div>

            {/* Standard Progress Overview */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Standard Roadmap</h4>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {STEPS.map(step => {
                  const isStepCompleted = userProgress[selectedUserId]?.completed_steps?.includes(step.id);
                  const stepTasksCompleted = step.tasks.filter(t => userProgress[selectedUserId]?.completed_tasks?.includes(t.id)).length;
                  
                  return (
                    <div key={step.id} className="py-4 border-b border-gray-800 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isStepCompleted ? 'bg-green-900/40 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                            {step.id}
                          </div>
                          <span className={`font-bold text-sm ${isStepCompleted ? 'text-gray-400' : 'text-white'}`}>{step.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{stepTasksCompleted} / {step.tasks.length}</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${isStepCompleted ? 'bg-green-600' : 'bg-amber-600'}`} 
                          style={{ width: `${(stepTasksCompleted / step.tasks.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && userToInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Invite Franchisee <span className="text-[10px] text-gray-700 font-mono">v2.1 (Setup Links)</span>
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 mb-8">
              Copy the template below to send a professional invitation to <span className="text-white font-bold">{userToInvite.email}</span>.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-gray-500">
                  <span>Subject</span>
                  <button 
                    onClick={() => copyToClipboard("Welcome to Creation Coffee - Your Onboarding Dashboard", 'subject')}
                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    {copiedField === 'subject' ? 'Copied!' : 'Copy Subject'}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 text-sm">
                  Welcome to Creation Coffee - Your Onboarding Dashboard
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-gray-500">
                  <span>Message Body</span>
                  <button 
                    onClick={() => copyToClipboard(
                      `Hello ${userToInvite.name},\n\n` +
                      `We're excited to have you on board! To help manage your journey with Creation Coffee, we've set up a personalized onboarding dashboard for you.\n\n` +
                      `You can track your steps, complete action items, and find helpful resources all in one place.\n\n` +
                      `Set up your secure access link here: ${window.location.origin}?setup=true&email=${encodeURIComponent(userToInvite.email)}\n\n` +
                      `Best regards,\n` +
                      `Creation Coffee Management`,
                      'body'
                    )}
                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    {copiedField === 'body' ? 'Copied!' : 'Copy Message Body'}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap h-64 overflow-y-auto custom-scrollbar">
                  {`Hello ${userToInvite.name},\n\n`}
                  {`We're excited to have you on board! To help manage your journey with Creation Coffee, we've set up a personalized onboarding dashboard for you.\n\n`}
                  {`You can track your steps, complete action items, and find helpful resources all in one place.\n\n`}
                  {`Set up your secure access link here: ${window.location.origin}?setup=true&email=${encodeURIComponent(userToInvite.email)}\n\n`}
                  {`Best regards,\n`}
                  {`Creation Coffee Management`}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => setShowInviteModal(false)}
                className="px-8 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
