import { useState } from "react";
import { KeyboardAvoidingView, Platform, View, StyleSheet, Image, ScrollView } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "@/lib/auth-context";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // New States
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  
  // NOTE: Your signUp function likely needs to be updated to accept username
  // See the "Step 2" section below this code block
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    setError(null);

    // 1. Basic Validation
    if (!email || !password || (isSignUp && !username)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // 2. Confirm Password Check
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    let result: string | null;

    if (isSignUp) {
      // Pass username to your signUp function
      // You might get a TypeScript error here until you update auth-context.tsx
      result = await signUp(email, password, username);
    } else {
      result = await signIn(email, password);
    }

    if (result) {
      setError(result);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/classynclogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* TITLE */}
          <Text variant="headlineSmall" style={styles.title}>
            {isSignUp ? "Create Account" : "Login"}
          </Text>

          {/* USERNAME INPUT (Only for Sign Up) */}
          {isSignUp && (
            <TextInput
              label="Username"
              mode="outlined"
              autoCapitalize="words"
              style={styles.input}
              outlineStyle={styles.outline}
              onChangeText={setUsername}
              value={username}
            />
          )}

          {/* EMAIL INPUT */}
          <TextInput
            label="Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            outlineStyle={styles.outline}
            onChangeText={setEmail}
            value={email}
          />

          {/* PASSWORD INPUT */}
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            style={styles.input}
            outlineStyle={styles.outline}
            onChangeText={setPassword}
            value={password}
          />

          {/* CONFIRM PASSWORD INPUT (Only for Sign Up) */}
          {isSignUp && (
            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry
              style={styles.input}
              outlineStyle={styles.outline}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
            />
          )}

          {error && (
            <Text style={{ color: theme.colors.error, marginTop: 5 }}>{error}</Text>
          )}

          {!isSignUp && (
            <Text style={styles.forgot}>Forgot Password?</Text>
          )}

          {/* BUTTON */}
          <Button
            mode="contained"
            style={styles.primaryBtn}
            contentStyle={styles.primaryContent}
            onPress={handleAuth}
          >
            {isSignUp ? "Sign Up" : "Login"}
          </Button>

          {/* SWITCH */}
          <Button mode="text" onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null); // Clear errors when switching modes
          }}>
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DFF7F3",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    gap: 12,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 180,
    height: 180,
  },
  title: {
    fontWeight: "700",
    color: "#0F2F2A",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "white",
  },
  outline: {
    borderRadius: 12,
    borderColor: "#B7E8DE",
  },
  forgot: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#2C8F7C",
  },
  primaryBtn: {
    borderRadius: 14,
    backgroundColor: "#35BDA7",
    marginTop: 6,
  },
  primaryContent: {
    paddingVertical: 6,
  },
});