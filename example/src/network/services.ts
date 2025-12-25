import { useRexiosClient } from '@rexios/react';
import { PATH } from './path';
import { useCallback } from 'react';

export const useAppServices = () => {
  const { query, mutate } = useRexiosClient();

  const getTodo = useCallback(
    async (id: string) => {
      return await query('getTodos', {
        request: {
          method: 'GET',
          url: PATH.GET_TODOS(id),
          dedupe: true,
        },
      });
    },
    [query]
  );

  const postTodo = useCallback(async () => {
    return await mutate('postTodo', {
      request: {
        method: 'POST',
        url: PATH.POST_TODOS(),
      },
    });
  }, [mutate]);

  const putTodo = useCallback(
    async (id: string) => {
      return await mutate('putTodo', {
        request: {
          method: 'PUT',
          url: PATH.PUT_TODOS(id),
        },
      });
    },
    [mutate]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      return await mutate('deleteTodo', {
        request: {
          method: 'DELETE',
          url: PATH.DELETE_TODOS(id),
        },
      });
    },
    [mutate]
  );
  return {
    getTodo,
    postTodo,
    putTodo,
    deleteTodo,
  };
};
