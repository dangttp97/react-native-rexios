import { createContext, useContext, useState } from 'react';
import type { RexiosProviderProps, RexiosContextType } from './types';

const RexiosContext = createContext<RexiosContextType | undefined>(undefined);

export const RexiosProvider = ({
  children,
  client,
}: // cacheStore,
// persist,
RexiosProviderProps) => {
  const [c] = useState(client);

  return (
    <RexiosContext.Provider value={{ client: c }}>
      {children}
    </RexiosContext.Provider>
  );
};

export const useRexiosContext = (): RexiosContextType => {
  const context = useContext(RexiosContext);
  if (!context) {
    throw new Error('useRexiosContext must be used within a RexiosProvider');
  }
  return context;
};
