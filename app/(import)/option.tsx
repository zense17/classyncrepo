import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ImportOptions() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Wait for component to be fully mounted before allowing image picker
  // This fixes the "unregistered ActivityResultLauncher" error
  useFocusEffect(
    useCallback(() => {
      setIsReady(false);

      // Small delay to ensure ActivityResultLauncher is registered
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 300);

      return () => {
        clearTimeout(timer);
        setIsReady(false);
      };
    }, []),
  );


  const handleScan = () => {
    router.push("/(import)/scan");
  };

  const handleUpload = async () => {
    // Prevent calling before component is ready
    if (!isReady) {
      console.log("Image picker not ready yet, waiting...");
      // Wait a bit more and try again
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsLoading(true);

    try {
      // Request Permission first
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access gallery is required to upload your COR.",
        );
        setIsLoading(false);
        return;
      }

      // Open Gallery with a small delay to ensure everything is ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      // Navigate if successful
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        router.push({
          pathname: "/(import)/loading",
          params: { uri: uri },
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);

      // If the specific ActivityResultLauncher error occurs, retry after delay
      if (
        error instanceof Error &&
        error.message.includes("ActivityResultLauncher")
      ) {
        Alert.alert(
          "Please Try Again",
          "The image picker is still initializing. Please tap the button again.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Error", "Failed to open image picker. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.title} />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/classynclogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title Section */}
        <Text style={styles.title}>Import COR</Text>
        <Text style={styles.subtitle}>Add your schedule instantly</Text>

        {/* Buttons Section */}
        <View style={styles.buttonGroup}>
          {/* Scan Button */}
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              pressed && styles.pressed,
            ]}
            onPress={handleScan}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.btnTitle}>Scan COR</Text>
            <Text style={styles.btnSubtitle}>
              Use camera to capture document
            </Text>
          </Pressable>

          {/* Upload Button */}
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              pressed && styles.pressed,
              (!isReady || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleUpload}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator
                  size="large"
                  color="#fff"
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.btnTitle}>Opening Gallery...</Text>
                <Text style={styles.btnSubtitle}>Please wait</Text>
              </>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={32}
                    color="#fff"
                  />
                </View>
                <Text style={styles.btnTitle}>Upload COR</Text>
                <Text style={styles.btnSubtitle}>JPG or PNG File</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Loading indicator while initializing */}
        {!isReady && (
          <View style={styles.initContainer}>
            <ActivityIndicator size="small" color="#1D9676" />
            <Text style={styles.initText}>Initializing...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F7FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  backBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    justifyContent: "center",
    marginTop: -60,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#546E7A",
    marginBottom: 40,
  },
  buttonGroup: {
    width: "100%",
    gap: 20,
  },
  bigButton: {
    backgroundColor: "#1D9676",
    borderRadius: 16,
    paddingVertical: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    width: "100%",
    minHeight: 110,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  iconCircle: {
    marginBottom: 10,
  },
  btnTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  btnSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  initContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  initText: {
    fontSize: 12,
    color: "#546E7A",
  },
});
