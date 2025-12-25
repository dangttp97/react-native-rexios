import { type RequestClient } from '@rexios/core';
import { useMemo } from 'react';
import { useRexiosContext } from '../RexiosProvider';

export const useRexiosClient = (): RequestClient => {
  const context = useRexiosContext();
  return useMemo(() => context.client, [context.client]);
};
