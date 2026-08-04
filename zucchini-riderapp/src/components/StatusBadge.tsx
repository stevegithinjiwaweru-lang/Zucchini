import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { orderStatusLabel, orderStatusColor } from "../utils/orderStatus";

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => (
  <View style={[styles.badge, { backgroundColor: orderStatusColor(status) }]}>
    <Text style={styles.text}>{orderStatusLabel(status)}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default StatusBadge;
