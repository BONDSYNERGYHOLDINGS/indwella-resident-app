import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../lib/apiClient";
import AppSafeAreaView from "../../components/AppSafeAreaView";
import Icon from "../../components/Icon";
import { useAuth } from "../../../contexts/AuthContext";

const parseAmount = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const amount = Number(value.replace(/,/g, ""));
    return Number.isFinite(amount) ? amount : 0;
  }

  return 0;
};

const formatCurrency = (value: unknown) => `₦${parseAmount(value).toLocaleString()}`;

const formatBillingPeriod = (month: unknown, year: unknown) => {
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 || !parsedYear) {
    return "";
  }

  return `${parsedMonth}/${parsedYear}`;
};

export default function PendingChargesScreen() {

    // Navigation hook for screen navigation
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getToken } = useAuth();


  const [loading, setLoading] = useState(false);
  const [charges, setCharges] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Fetch Pending Charges
  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await api.get("/resident-PCharges", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      console.log("Pending Charges API response:", res.data);

      // Extract the array from the object
      const chargesArray = res.data.unpaid_charges || [];
      const fallbackTotal = chargesArray.reduce(
        (sum: number, charge: any) => sum + parseAmount(charge.amount),
        0
      );

      // Optional: log each charge
      chargesArray.forEach((charge: any, index: number) => {
        console.log(`Charge ${index + 1}:`, charge);
      });

      // Set charges array to state
      setCharges(chargesArray);
      setTotalAmount(
        res.data.total_amount !== undefined
          ? parseAmount(res.data.total_amount)
          : fallbackTotal
      );
      setInsufficientBalance(false);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setCharges([]);
        setTotalAmount(0);
      } else {
        console.error(error);
        Alert.alert("Error", "Failed to load pending charges");
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Pay All Charges
  const clearPendingCharges = async () => {
    setPaying(true);
    try {
      const token = await getToken();
       const res = await api.post(
      "/wallet/pay-all-service-charges",
      { total_amount: totalAmount },
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    );

    console.log("Pay All Charges response:", res.data);
     


      if (res.data.status === "success") {
        Alert.alert("Success", "Charges cleared successfully!");
        fetchCharges();
      } else if (res.data.error === "INSUFFICIENT_BALANCE") {
        setInsufficientBalance(true); 
        console.log("Charges API response:", res.data);
      }
    } catch (error:any) {
     // Extract precise error message from backend
    const backendMessage = error.response?.data?.detail || error.message || "Unknown error";

    if (__DEV__) {
      console.log("Error clearing charges:", error.response?.data || error.message);
    }

    // Show precise error in alert
    Alert.alert("Notice", backendMessage);
    } finally {
      setPaying(false);
    }
  };

  // Credit Wallet (Paystack)
  // const creditWallet = async () => {
  //   try {
  //     const token = await AsyncStorage.getItem('resident');
  //     const res = await axios.post("YOUR_API_URL/credit-wallet", {
  //       amount: 5000, // Replace with dynamic amount input
  //     }, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     if (res.data.authorization_url) {
  //       // Redirect to Paystack checkout
  //       Linking.openURL(res.data.authorization_url);
  //     } else {
  //       Alert.alert("Error", "Could not start payment process");
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     Alert.alert("Error", "Credit wallet failed");
  //   }
  // };



  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  return (
    <AppSafeAreaView>
  <View style={{ flex: 1, padding: 20 }}>
    <View style={{justifyContent: "flex-start", alignItems:"center", gap: 5, flexDirection: 'row', marginBottom: 25}}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 8,
    marginRight: 8,}}>
           <Icon name="arrowLLine" size={18} />
        </TouchableOpacity>
      <View>
        <Text style={{fontSize: 20, fontWeight: "bold", marginBottom: 0, color: "black" }}>Pending Charges</Text>
        <Text style={{color:'black'}}>Charges Yet to be paid</Text>
      </View>
      </View>
    {loading ? (
      <ActivityIndicator size="large" color="#6C63FF" />
    ) : charges.length === 0 ? (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#666" }}>
          🎉 No pending charges
        </Text>
      </View>
    ) : (
      <>
        <FlatList
          data={charges}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 15,
                backgroundColor: "#F8F8F8",
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {formatCurrency(item.amount)}
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end", marginLeft: 12 }}>
                <Text style={{ color: "#333", textAlign: "right", fontWeight: "700" }}>{item.name}</Text>
                {!!formatBillingPeriod(item.billing_month, item.billing_year) && (
                  <Text style={{ color: "#666", fontSize: 12, fontWeight: "600", marginTop: 4 }}>
                    Period: {formatBillingPeriod(item.billing_month, item.billing_year)}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ marginTop: 10, paddingBottom: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderTopWidth: 1, borderTopColor: "#EAEAEA" }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "black" }}>Total Amount</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#6C63FF" }}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: "#6C63FF",
                  padding: 15,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 20,
                }}
                onPress={clearPendingCharges}
                disabled={paying}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {paying ? "Processing..." : "Clear Pending Charges"}
                </Text>
              </TouchableOpacity>

              {insufficientBalance && (
                <View style={{ marginTop: 20, alignItems: "center" }}>
                  <Text style={{ color: "red", fontSize: 16 }}>⚠️ Insufficient Balance</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "orange",
                      padding: 15,
                      borderRadius: 10,
                      marginTop: 10,
                    }}
                    onPress={() => {
                      navigation.navigate("ResidentApp", { screen: "credit" });
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 16 }}>Fund Wallet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      </>
    )}
  </View>


    </AppSafeAreaView>
  );
}
