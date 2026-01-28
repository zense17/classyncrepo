import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function FrontPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top spacer to push content down slightly */}
      <View style={{ flex: 1 }} />

      {/* Main Content: Logo, Title, and Tagline */}
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
            <Image 
                source={require("../assets/images/classynclogo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>

        <Text style={styles.tagline}>
          Your time belongs in learning,{'\n'}not scheduling.
        </Text>
      </View>

      {/* Bottom Section: Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA', // Light cyan background
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentContainer: {
    alignItems: 'center',
    flex: 3,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 180, 
    height: 180,
  },
  
  tagline: {
    fontSize: 18,
    color: '#00695C', // Darker teal
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 50,
  },
  button: {
    backgroundColor: '#26A69A',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5, 
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});