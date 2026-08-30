'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ultraia-course-progress';

type ProgressMap = Record<string, true>;

interface ProgressContextValue {
  completed: ProgressMap;
  isDone: (key: string) => boolean;
  toggle: (key: string) => void;
  countDone: (keys: string[]) => number;
}

const ProgressContext = createContext<ProgressContextValue>({
  completed: {},
  isDone: () => false,
  toggle: () => {},
  countDone: () => 0,
});

export function CourseProgressProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<ProgressMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(JSON.parse(raw) as ProgressMap);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const toggle = useCallback((key: string) => {
    setCompleted((prev) => {
      const next: ProgressMap = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      window.dispatchEvent(new Event('course-progress-changed'));
      return next;
    });
  }, []);

  const isDone = useCallback((key: string) => !!completed[key], [completed]);

  const countDone = useCallback(
    (keys: string[]) => keys.filter((k) => completed[k]).length,
    [completed],
  );

  return (
    <ProgressContext.Provider value={{ completed, isDone, toggle, countDone }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useCourseProgress() {
  return useContext(ProgressContext);
}
