export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createUndoRedo<T>(initialState: T): UndoRedoState<T> {
  return {
    past: [],
    present: initialState,
    future: [],
  };
}

export function undo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
  };
}

export function push<T>(state: UndoRedoState<T>, newPresent: T): UndoRedoState<T> {
  return {
    past: [...state.past, state.present],
    present: newPresent,
    future: [],
  };
}

export function canUndo<T>(state: UndoRedoState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: UndoRedoState<T>): boolean {
  return state.future.length > 0;
}
