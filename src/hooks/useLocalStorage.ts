import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      try {
        const valueToStore = value instanceof Function ? (value as (val: T) => T)(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
        return prev;
      }
    });
  };

  return [storedValue, setValue] as const;
}
