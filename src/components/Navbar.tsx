import { Alert, DeviceEventEmitter, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "./Icon";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../lib/apiClient";

type NavbarProps = {
  userRole: "resident" | "admin" | "security";
  firstName?: string;
  shortAddress?: string;
  fullAddress?: string;
};

type NotificationCountChangedEvent = {
  unreadDelta?: number;
};

export default function Navbar({ userRole, firstName, shortAddress, fullAddress }: NavbarProps) {
  const { width } = Dimensions.get("window");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const { getToken } = useAuth();

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const token = await getToken();
      const endpoint = userRole === "resident" 
        ? "/notifications/resident/unread-count"
        : "/notifications/admin/unread-count";
      
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      // Silently fail - notification badge is not critical
      console.error("Failed to fetch unread count:", err);
    }
  }, [getToken, userRole]);

  // Fetch unread notification count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "notificationCountChanged",
      (payload?: NotificationCountChangedEvent) => {
        const unreadDelta = payload?.unreadDelta;
        if (unreadDelta) {
          setUnreadCount((current) => Math.max(0, current + unreadDelta));
        }

        fetchUnreadCount();
      },
    );

    return () => subscription.remove();
  }, [fetchUnreadCount]);

  const renderLeftSection = () => {
    switch (userRole) {
      case "resident": {
        const displayAddress = fullAddress?.trim() || shortAddress || "N/A";
        const displayName = firstName?.trim();
        const greetingText = displayName ? `Hi, ${displayName}` : "Hi";

        return (
          <View style={styles.residentHeader}>
            <Text style={styles.residentWelcome} numberOfLines={1}>
              {greetingText}
              <Text style={styles.residentAddressText}> · {displayAddress}</Text>
            </Text>
          </View>
        );
      }

      case "admin":
        return (
          <View>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>We're glad you're here!</Text>
          </View>
        );

      case "security":
        return (
          <View>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Stay alert 🚨</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const handleNotificationPress = () => {
    switch (userRole) {
      case "resident":
        navigation.navigate("ResidentApp", { screen: "notification" });
        break;
      case "admin":
        navigation.navigate("AdminApp", { screen: "notification" });
        break;
      case "security":
        Alert.alert("Info", "Notifications are not available for security users yet.");
        break;
    }
  };

  return (
    <View style={[styles.container, { width }]}>
      {/* Left Section */}
      <View style={styles.leftSection}>{renderLeftSection()}</View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        {/* USER (Only for resident) */}
        {userRole === "resident" && (
          <TouchableOpacity
            onPress={() => navigation.navigate("ResidentApp", { screen: "resident_profile" })}
            style={styles.iconButton}
          >
            <Icon name="userbgless" size={15} />
          </TouchableOpacity>
        )}

        {/* BELL */}
        <TouchableOpacity 
          onPress={handleNotificationPress} 
          style={styles.iconButton}
        >
          <Icon name="bell" size={15} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* HAMBURGER */}
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.iconButton}
        >
          <Icon name="hamburger" size={15} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  leftSection: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    width: 34,
    backgroundColor: "#E7D8F6",
    borderRadius: 17,
  },
  residentHeader: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    maxWidth: "96%",
    minHeight: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#E7D8F6",
    borderRadius: 15,
  },
  residentWelcome: {
    fontSize: 14,
    fontWeight: "800",
    color: "#424762",
    maxWidth: "100%",
  },
  badge: {
      position: "absolute",
      top: -8,
      right: -8,
      backgroundColor: "#D92D20",
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFFFFF",
  },
  badgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
  },
  residentAddressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#424762",
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#8506FF",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#000",
    marginTop: 5,
  },
});
