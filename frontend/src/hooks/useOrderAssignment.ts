import { message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

const invalidateAssignmentQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["riders"] });
};

export function useAssignOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      client.post(`/orders/${orderId}/assign`, { riderId }),
    onSuccess: () => {
      message.success("Rider assigned successfully");
      invalidateAssignmentQueries(queryClient);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || "Failed to assign rider");
    },
  });
}

export function useUnassignOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => client.post(`/orders/${orderId}/unassign`),
    onSuccess: () => {
      message.success("Order unassigned");
      invalidateAssignmentQueries(queryClient);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || "Failed to unassign order");
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      client.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      message.success("Order status updated");
      invalidateAssignmentQueries(queryClient);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error || "Failed to update order status");
    },
  });
}
