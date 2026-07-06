import { useCallback, useState } from 'react';

const MAX_HISTORY_ITEMS = 50;

export function useEditorHistory(initialValue = null, { onDirty } = {}) {
  const [value, setValue] = useState(initialValue);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const markDirty = useCallback(() => {
    onDirty?.();
  }, [onDirty]);

  const reset = useCallback((nextValue = null) => {
    setValue(nextValue);
    setPast([]);
    setFuture([]);
  }, []);

  const replace = useCallback((nextValue) => {
    setValue(nextValue);
  }, []);

  const commit = useCallback((nextValue) => {
    setValue((currentValue) => {
      if (currentValue == null) return nextValue;

      setPast((currentPast) => {
        const nextPast = [...currentPast, currentValue];
        if (nextPast.length > MAX_HISTORY_ITEMS) nextPast.shift();
        return nextPast;
      });
      setFuture([]);
      return nextValue;
    });
    markDirty();
  }, [markDirty]);

  const undo = useCallback(() => {
    setPast((currentPast) => {
      if (currentPast.length === 0) return currentPast;

      const previous = currentPast[currentPast.length - 1];
      const nextPast = currentPast.slice(0, currentPast.length - 1);

      setValue((currentValue) => {
        setFuture((currentFuture) => [currentValue, ...currentFuture]);
        return previous;
      });
      markDirty();
      return nextPast;
    });
  }, [markDirty]);

  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) return currentFuture;

      const next = currentFuture[0];
      const nextFuture = currentFuture.slice(1);

      setValue((currentValue) => {
        setPast((currentPast) => [...currentPast, currentValue]);
        return next;
      });
      markDirty();
      return nextFuture;
    });
  }, [markDirty]);

  return {
    value,
    setValue: replace,
    reset,
    replace,
    commit,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
