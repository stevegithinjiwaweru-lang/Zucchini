import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMyOrders,
  RiderOrder,
  displayOrderNumber,
} from "../services/orders.service";
import StatusBadge from "../components/StatusBadge";
import { COLORS, RADIUS } from "../theme/colors";

type Tab = "active" | "completed";

const DeliveriesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeOrders, setActiveOrders] = useState<RiderOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<RiderOrder[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await getMyOrders("all");
      setActiveOrders(data.active);
      setCompletedOrders(data.completed);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not load deliveries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const list = tab === "active" ? activeOrders : completedOrders;

  const emptyMessage = useMemo(() => {
    if (tab === "active") return "No active deliveries right now";
    return "No completed deliveries yet";
  }, [tab]);

  const renderCard = ({ item }: { item: RiderOrder }) => {
    const isCompleted = ["DELIVERED", "FAILED", "RETURNED"].includes(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("DeliveryDetail", { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>{displayOrderNumber(item)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.customer}>{item.customerName}</Text>
        <Text style={styles.addressLabel}>Pickup</Text>
        <Text style={styles.address}>{item.pickupLocation || item.address}</Text>
        {item.destination ? (
          <>
            <Text style={styles.addressLabel}>Destination</Text>
            <Text style={styles.address}>{item.destination}</Text>
          </>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.distance ? `${item.distance} km` : "—"}</Text>
          <Text style={styles.meta}>
            {isCompleted && item.deliveredAt
              ? `Delivered ${new Date(item.deliveredAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : item.scheduledAt
                ? new Date(item.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No scheduled time"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Deliveries</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "completed" && styles.tabActive]}
          onPress={() => setTab("completed")}
        >
          <Text style={[styles.tabText, tab === "completed" && styles.tabTextActive]}>
            Completed ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => o.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
          renderItem={renderCard}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS - 2,
    alignItems: "center",
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: COLORS.muted, marginTop: 60 },
  error: { color: COLORS.critical || "#d03b3b", marginBottom: 8, textAlign: "center" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderNo: { fontWeight: "800", color: COLORS.primary, fontSize: 14 },
  customer: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  addressLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  address: { fontSize: 14, color: COLORS.text },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  meta: { fontSize: 12, color: COLORS.muted },
});

export default DeliveriesScreen;
