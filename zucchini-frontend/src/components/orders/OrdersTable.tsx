*** Begin Patch
*** Update File: zucchini-frontend/src/components/orders/OrdersTable.tsx
@@
-import client from "../../api/client";
+import client from "../../api/client";
+import { deleteOrder } from "../../services/dispatch.service";
@@
-  const handleDelete = (id: string) => {
-    Modal.confirm({
-      title: "Delete order",
-      content: "Are you sure you want to permanently delete this order? This action cannot be undone.",
-      okText: "Delete",
-      okType: "danger",
-      onOk: async () => {
-        try {
-          await client.delete(`/orders/${id}`);
-          message.success("Order deleted");
-          queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
-          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
-        } catch (err: any) {
-          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
-        }
-      },
-    });
-  };
+  const handleDelete = (id: string) => {
+    Modal.confirm({
+      title: "Delete order",
+      content: "Are you sure you want to permanently delete this order? This action cannot be undone.",
+      okText: "Delete",
+      okType: "danger",
+      onOk: async () => {
+        try {
+          // centralized delete API
+          await deleteOrder(id);
+          message.success("Order deleted");
+          // Invalidate the OrdersPage query with its filters so the table refreshes
+          queryClient.invalidateQueries({ queryKey: ["ordersPage", filters] });
+          // Also invalidate the dispatch list so both views stay consistent
+          queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
+        } catch (err: any) {
+          message.error(err?.response?.data?.error || err?.message || "Failed to delete order");
+        }
+      },
+    });
+  };
@@
-      queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
-      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
+      queryClient.invalidateQueries({ queryKey: ["ordersPage", filters] });
+      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
*** End Patch
