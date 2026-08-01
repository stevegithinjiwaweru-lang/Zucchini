import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMyOrders, RiderOrder } from "../services/orders.service";
import StatusBadge from "../components/StatusBadge";
import { COLORS, RADIUS } from "../theme/colors";

const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "ARRIVED", "PICKED_UP", "IN_TRANSIT"];

const DeliveriesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 15000); // matches web dashboard's 15s poll
      return () => clearInterval(interval);
    }, [])
  );

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Deliveries</Text>
      <Text style={styles.count}>{active.length} active</Text>

      <FlatList
        data={active}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No active deliveries right now</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("DeliveryDetail", { orderId: item.id })}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderNo}>{item.id.slice(0, 8).toUpperCase()}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.customer}>{item.customerName}</Text>
            <Text style={styles.addressLabel}>Pickup</Text>
            <Text style={styles.address}>{item.address}</Text>
            {item.destination ? (
              <>
                <Text style={styles.addressLabel}>Destination</Text>
                <Text style={styles.address}>{item.destination}</Text>
              </>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{item.distance ? `${item.distance} km` : "—"}</Text>
              <Text style={styles.meta}>
                {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "No scheduled time"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  count: { fontSize: 13, color: COLORS.muted, marginBottom: 16 },
  empty: { textAlign: "center", color: COLORS.muted, marginTop: 60 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderNo: { fontWeight: "800", color: COLORS.primary, fontSize: 14 },
  customer: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  addressLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  address: { fontSize: 14, color: COLORS.text },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  meta: { fontSize: 12, color: COLORS.muted },
});

export default DeliveriesScreen;
