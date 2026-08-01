import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator } from "react-native";
import { getOrder, updateOrderStatus, RiderOrder } from "../services/orders.service";
import StatusBadge from "../components/StatusBadge";
import { RIDER_STATUS_FLOW } from "../utils/orderStatus";
import { COLORS, RADIUS } from "../theme/colors";

const DeliveryDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (err) {
      Alert.alert("Error", "Could not load this delivery.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const nextStep = order ? RIDER_STATUS_FLOW.find((s) => s.from === order.status) : undefined;

  const advance = async () => {
    if (!order || !nextStep) return;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, nextStep.next);
      await load();
      if (nextStep.next === "DELIVERED") {
        Alert.alert("Delivered", "Nice work — this delivery is complete.");
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert("Update failed", err?.response?.data?.error || "Could not update delivery status.");
    } finally {
      setUpdating(false);
    }
  };

  const markFailed = async () => {
    if (!order) return;
    Alert.alert("Mark as delivery failed?", "This should only be used if the delivery genuinely could not be completed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: "destructive",
        onPress: async () => {
          setUpdating(true);
          try {
            await updateOrderStatus(order.id, "FAILED");
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Update failed", err?.response?.data?.error || "Could not update delivery status.");
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const openNavigation = () => {
    if (!order) return;
    const dest = order.status === "ASSIGNED" || order.status === "ACCEPTED" ? order.address : order.destination || order.address;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
    Linking.openURL(url);
  };

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <Text style={styles.orderNo}>{order.id.slice(0, 8).toUpperCase()}</Text>
        <StatusBadge status={order.status} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Customer</Text>
        <Text style={styles.value}>{order.customerName}</Text>
        {order.phone ? <Text style={styles.subValue}>{order.phone}</Text> : null}

        <Text style={styles.sectionLabel}>Pickup</Text>
        <Text style={styles.value}>{order.address}</Text>

        {order.destination ? (
          <>
            <Text style={styles.sectionLabel}>Destination</Text>
            <Text style={styles.value}>{order.destination}</Text>
          </>
        ) : null}

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.sectionLabel}>Distance</Text>
            <Text style={styles.value}>{order.distance ? `${order.distance} km` : "—"}</Text>
          </View>
          <View>
            <Text style={styles.sectionLabel}>Scheduled</Text>
            <Text style={styles.value}>
              {order.scheduledAt ? new Date(order.scheduledAt).toLocaleString() : "—"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
        <Text style={styles.navButtonText}>Open in Maps</Text>
      </TouchableOpacity>

      {nextStep ? (
        <TouchableOpacity style={styles.primaryButton} onPress={advance} disabled={updating}>
          <Text style={styles.primaryButtonText}>{updating ? "Updating..." : nextStep.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>This delivery is {order.status === "DELIVERED" ? "complete" : "closed"}.</Text>
        </View>
      )}

      {["ACCEPTED", "ARRIVED", "PICKED_UP", "IN_TRANSIT"].includes(order.status) && (
        <TouchableOpacity style={styles.failButton} onPress={markFailed} disabled={updating}>
          <Text style={styles.failButtonText}>Report Delivery Failed</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderNo: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, color: COLORS.muted, marginTop: 12 },
  value: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  subValue: { fontSize: 13, color: COLORS.muted },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  navButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  navButtonText: { color: COLORS.primary, fontWeight: "700" },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  failButton: { alignItems: "center", paddingVertical: 12 },
  failButtonText: { color: COLORS.critical, fontWeight: "600" },
  doneBanner: { backgroundColor: COLORS.good, borderRadius: RADIUS, padding: 16, alignItems: "center", marginBottom: 12 },
  doneBannerText: { color: "#fff", fontWeight: "700" },
});

export default DeliveryDetailScreen;
