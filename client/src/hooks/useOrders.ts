import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateRange, Order } from '../types';
import * as api from '../api/client';

export function useOrders(dateRange: DateRange | null) {
  return useQuery({
    queryKey: ['orders', dateRange],
    queryFn: () => api.getOrders(dateRange!),
    enabled: !!dateRange,
    staleTime: 30 * 1000, // Dane świeże przez 30 sekund
    gcTime: 5 * 60 * 1000, // Cache przez 5 minut
  });
}

interface UpdateOrderLineParams {
  id_zlecenia: number;
  new_line: number;
}

interface MutationContext {
  previousOrders: [unknown, Order[] | undefined][];
}

export function useUpdateOrderLine() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, UpdateOrderLineParams, MutationContext>({
    mutationFn: ({ id_zlecenia, new_line }) =>
      api.updateOrderLine(id_zlecenia, new_line),

    // Optimistic update - natychmiastowa zmiana UI
    onMutate: async ({ id_zlecenia, new_line }) => {
      // Anuluj trwające zapytania, żeby nie nadpisały optimistic update
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      // Zapisz poprzedni stan dla rollbacku
      const queries = queryClient.getQueriesData<Order[]>({ queryKey: ['orders'] });
      const previousOrders = queries.map(([key, data]) => [key, data] as [unknown, Order[] | undefined]);

      // Optimistic update - zmień linię w cache
      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.map((order) =>
          order.id_zlecenia === id_zlecenia
            ? { ...order, liniapm: new_line }
            : order
        );
      });

      return { previousOrders };
    },

    // Rollback przy błędzie
    onError: (_err, _variables, context) => {
      if (context?.previousOrders) {
        for (const [key, data] of context.previousOrders) {
          if (data) {
            queryClient.setQueryData(key as unknown[], data);
          }
        }
      }
    },

    // Zawsze synchronizuj z serwerem po zakończeniu
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
