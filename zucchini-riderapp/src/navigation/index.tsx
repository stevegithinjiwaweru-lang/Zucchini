import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text } from "react-native";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import DeliveriesScreen from "../screens/DeliveriesScreen";
import DeliveryDetailScreen from "../screens/DeliveryDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS } from "../theme/colors";

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="Deliveries"
              component={DeliveriesScreen}
              options={({ navigation }) => ({
                title: "Easybox Rider",
                headerRight: () => (
                  <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
                    <Text style={{ color: COLORS.primary, fontWeight: "700" }}>Profile</Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} options={{ title: "Delivery" }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
