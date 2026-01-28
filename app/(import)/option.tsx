import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker'; // Import Image Picker
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ImportOptions() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  // 1. UPDATE THIS FUNCTION (Navigate to Scan Page)
  const handleScan = () => {
    router.push("/scan"); 
  };

  // 2. UPDATE THIS FUNCTION (Open Gallery & Navigate to Preview)
  const handleUpload = async () => {
    // Request Permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access gallery is required!");
      return;
    }

    // Open Gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, 
      quality: 1,
    });

    // Navigate if successful
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // Pass the URI to the preview page
      router.push({
        pathname: "/(import)/loading",
        params: { uri: uri }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
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
            style={({ pressed }) => [styles.bigButton, pressed && styles.pressed]}
            onPress={handleScan}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.btnTitle}>Scan COR</Text>
            <Text style={styles.btnSubtitle}>Use camera to capture document</Text>
          </Pressable>

          {/* Upload Button */}
          <Pressable 
            style={({ pressed }) => [styles.bigButton, pressed && styles.pressed]}
            onPress={handleUpload}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-upload-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.btnTitle}>Upload COR</Text>
            <Text style={styles.btnSubtitle}>JPG or PNG File</Text>
          </Pressable>

        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6FA3A3", 
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
    marginTop: -60, 
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#546E7A",
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    gap: 20,
  },
  bigButton: {
    backgroundColor: "#1D9676", 
    borderRadius: 16,
    paddingVertical: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    marginBottom: 10,
  },
  btnTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: "#fff",
    marginBottom: 4,
  },
  btnSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
});