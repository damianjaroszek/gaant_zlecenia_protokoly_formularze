import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateRange } from '../types';
import * as api from '../api/client';

export function useOrders(dateRange: DateRange | null) {
  return useQuery({
    queryKey: ['orders', dateRange],
    queryFn: () => api.getOrders(dateRange!),
    enabled: !!dateRange,
  });
}

export function useUpdateOrderLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id_zlecenia, new_line }: { id_zlecenia: number; new_line: number }) =>
      api.updateOrderLine(id_zlecenia, new_line),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
