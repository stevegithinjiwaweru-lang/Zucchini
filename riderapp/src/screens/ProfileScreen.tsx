import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, RADIUS } from "../theme/colors";

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS, padding: 20, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  phone: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  logoutButton: { borderWidth: 1, borderColor: COLORS.critical, borderRadius: RADIUS, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: COLORS.critical, fontWeight: "700" },
});

export default ProfileScreen;
