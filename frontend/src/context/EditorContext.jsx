import React, { createContext, useContext } from 'react';

const EditorContext = createContext(null);

export function EditorProvider({ value, children }) {
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

export default EditorContext;
