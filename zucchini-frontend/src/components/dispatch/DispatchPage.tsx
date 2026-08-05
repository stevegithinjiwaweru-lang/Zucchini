@@
*** Begin Patch
*** Update File: zucchini-frontend/src/components/dispatch/DispatchPage.tsx
@@
-import { fetchPendingDispatchOrders, deleteOrder } from "../../services/dispatch.service";
-import { getSocket } from "../../services/socket";
-import client from "../../api/client";
+import { fetchPendingDispatchOrders, deleteOrder } from "../../services/dispatch.service";
+import { getSocket } from "../../services/socket";
@@
-      onOk: async () => {
-        try {
-          await client.delete(`/orders/${id}`);
-          message.success("Order deleted");
-          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
-          queryClient.invalidateQueries({ queryKey: ["orders"] });
-        } catch (err: any) {
-          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
-        }
-      },
+      onOk: async () => {
+        try {
+          await deleteOrder(id);
+          message.success("Order deleted");
+          queryClient.invalidateQueries({ queryKey: ["dispatchOrders", filters] });
+          queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
+        } catch (err: any) {
+          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
+        }
+      },
*** End Patch
