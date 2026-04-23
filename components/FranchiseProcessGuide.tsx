import React, { useState, useEffect } from 'react';
import { STEPS } from '../constants';
import type { ProcessStep, Task, CustomTask } from '../types';
import FDDGuide from './FDDGuide';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface FranchiseProcessGuideProps {
  userId: string;
  completedSteps: Set<number>;
  onStepComplete: (stepId: number) => void;
  completedTasks: Set<string>;
  onTaskToggle: (taskId: string) => void;
  onCustomTaskToggle?: (task: CustomTask) => void;
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const StepDetail: React.FC<{
    step: ProcessStep;
    onStepComplete: () => void;
    isCompleted: boolean;
    completedTasks: Set<string>;
    onTaskToggle: (taskId: string) => void;
  }> = ({ step, onStepComplete, isCompleted, completedTasks, onTaskToggle }) => {

  const allTasksCompleted = step.tasks.every(task => completedTasks.has(task.id));

  return (
    <div className="bg-gray-900 p-6 sm:p-8 rounded-2xl w-full shadow-lg shadow-black/20">
      <h2 className="text-2xl sm:text-3xl font-bold text-amber-500">{step.title}</h2>
      <p className="mt-1 text-lg text-gray-400">{step.subtitle}</p>
      <p className="mt-4 text-gray-300">{step.description}</p>
      
      {step.id === 3 && <FDDGuide />}
      
      <div className="mt-8 border-t border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Action Items</h3>
        <ul className="space-y-4">
          {step.tasks.map((task) => (
            <li key={task.id} className="flex items-start">
              <label className="flex items-start cursor-pointer text-gray-300 hover:text-white transition-colors w-full">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={completedTasks.has(task.id)}
                  onChange={() => onTaskToggle(task.id)}
                  disabled={isCompleted}
                />
                <div className={`w-6 h-6 rounded-md border-2 ${completedTasks.has(task.id) ? 'bg-amber-600 border-amber-600' : 'border-gray-600 bg-gray-800'} flex-shrink-0 flex items-center justify-center mr-4 mt-1 transition-all`}>
                  {completedTasks.has(task.id) && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <span className={`${completedTasks.has(task.id) ? 'line-through text-gray-500' : ''}`}>{task.text}</span>
                  {task.description && (
                    <p className={`mt-1 text-sm ${completedTasks.has(task.id) ? 'text-gray-600' : 'text-gray-400'}`}>{task.description}</p>
                  )}
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {!isCompleted && (
        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={onStepComplete}
            disabled={!allTasksCompleted}
            className="w-full sm:w-auto px-8 py-3 bg-amber-600 text-white font-bold rounded-lg shadow-md hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500"
          >
            Mark Step as Complete
          </button>
        </div>
      )}
      {isCompleted && (
        <div className="mt-8 pt-6 border-t border-gray-700 flex items-center space-x-3 text-green-400">
            <CheckIcon className="w-6 h-6"/>
            <span className="font-semibold text-lg">Step Completed!</span>
        </div>
      )}
    </div>
  );
};

const FranchiseProcessGuide: React.FC<FranchiseProcessGuideProps> = ({ userId, completedSteps, onStepComplete, completedTasks, onTaskToggle, onCustomTaskToggle }) => {
  const [activeStepId, setActiveStepId] = useState(1);
  const [userCustomTasks, setUserCustomTasks] = useState<CustomTask[]>([]);
  const activeStep = STEPS.find(s => s.id === activeStepId) || STEPS[0];
  
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'custom_tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: CustomTask[] = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() } as CustomTask);
      });
      setUserCustomTasks(tasks);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'custom_tasks'));

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    // Find the first uncompleted step and set it as active
    const firstUncompleted = STEPS.find(step => !completedSteps.has(step.id));
    if (firstUncompleted) {
      setActiveStepId(firstUncompleted.id);
    } else {
      // If all are completed, stay on the last step
      setActiveStepId(STEPS.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSteps]);


  const handleStepCompletion = () => {
    onStepComplete(activeStepId);
    const nextStep = STEPS.find(s => s.id === activeStepId + 1);
    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  };
  
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
      {/* LEFT SIDEBAR: Steps */}
      <nav className="w-full lg:w-1/4 sticky top-24">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 px-4">Onboarding Roadmap</h3>
        <ol className="space-y-2">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isActive = step.id === activeStepId;
            return (
              <li key={step.id} onClick={() => setActiveStepId(step.id)} className="cursor-pointer">
                <div className={`p-4 rounded-xl transition-all ${isActive ? 'bg-gray-800' : 'hover:bg-gray-900'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isCompleted ? 'bg-green-600/20 text-green-500' : isActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-gray-800 text-gray-500'}`}>
                      {isCompleted ? <CheckIcon className="w-5 h-5"/> : step.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>{step.title}</p>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* MIDDLE: Step Detail */}
      <div className="flex-1 w-full lg:max-w-2xl">
        <StepDetail
          step={activeStep}
          onStepComplete={handleStepCompletion}
          isCompleted={completedSteps.has(activeStepId)}
          completedTasks={completedTasks}
          onTaskToggle={onTaskToggle}
        />
      </div>

      {/* RIGHT SIDEBAR: Custom Tasks */}
      <aside className="w-full lg:w-1/4 sticky top-24">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-3">
            <div className="bg-amber-600/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Your Tasks</h3>
          </div>

          {userCustomTasks.length > 0 ? (
            <ul className="space-y-4">
              {userCustomTasks.map(task => (
                <li key={task.id}>
                  <label className="flex items-start cursor-pointer group">
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={task.completed}
                      onChange={() => onCustomTaskToggle?.(task)}
                    />
                    <div className={`w-5 h-5 rounded border-2 mt-0.5 ${task.completed ? 'bg-amber-600 border-amber-600' : 'border-gray-600 bg-gray-800'} flex-shrink-0 flex items-center justify-center mr-3 transition-all group-hover:border-amber-500/50`}>
                      {task.completed && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-sm leading-relaxed transition-colors ${task.completed ? 'line-through text-gray-500' : 'text-gray-300 group-hover:text-white'}`}>
                      {task.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-dashed border-gray-700">
                <p className="text-xs text-gray-500 italic">No additional tasks assigned at this time.</p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-800">
             <div className="bg-amber-600/10 rounded-xl p-4 border border-amber-600/20">
                <p className="text-[10px] uppercase font-black text-amber-500 tracking-widest mb-1">Status</p>
                <div className="flex justify-between items-end">
                   <p className="text-white font-bold text-sm">Onboarding</p>
                   <p className="text-amber-500 font-mono text-xs">{Math.round((completedSteps.size / STEPS.length) * 100)}% Complete</p>
                </div>
             </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default FranchiseProcessGuide;