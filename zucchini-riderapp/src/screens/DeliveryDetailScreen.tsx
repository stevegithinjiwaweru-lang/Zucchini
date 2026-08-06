
import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { displayOrderNumber } from '../services/orders.service';

// ... (other imports & styles omitted)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <Text style={styles.orderNo}>{displayOrderNumber(order)}</Text>
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

// ... (rest unchanged)
