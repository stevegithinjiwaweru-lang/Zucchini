import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, RADIUS } from "../theme/colors";

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Missing details", "Enter your phone number and password.");
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: any) {
      Alert.alert("Login failed", err?.response?.data?.error || "Check your phone and password and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.logo}>Easybox Rider</Text>
      <Text style={styles.subtitle}>Sign in to see your deliveries</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="07xx xxx xxx"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", padding: 24 },
  logo: { fontSize: 28, fontWeight: "800", color: COLORS.primary, textAlign: "center" },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginBottom: 32, marginTop: 4 },
  form: { backgroundColor: COLORS.card, borderRadius: RADIUS, padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

export default LoginScreen;
