import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  Image,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { Colors } from "@/constants/colors";

type AuthStep = "credentials" | "otp";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");

  // States
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signIn, signUp, verifyOTP, resendOTP } = useAuth();

  const handleAuth = async () => {
    setError(null);
    setSuccessMessage(null);

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

    setIsLoading(true);

    if (isSignUp) {
      const result = await signUp(email, password, username);
      setIsLoading(false);

      if (result.success && result.userId) {
        // Move to OTP verification step
        setUserId(result.userId);
        setAuthStep("otp");
      } else {
        setError(result.error || "Sign up failed");
      }
    } else {
      const result = await signIn(email, password);
      setIsLoading(false);

      if (result.success && result.requiresOTP && result.userId) {
        // User needs to verify OTP
        setUserId(result.userId);
        setAuthStep("otp");
      } else if (result.success) {
        // Direct login (if email already verified)
        // User will be redirected automatically by auth context
      } else {
        setError(result.error || "Login failed");
      }
    }
  };

  const handleVerifyOTP = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!otp || otp.length < 6) {
      setError("Please enter the verification code.");
      return;
    }

    if (!userId) {
      setError("Session expired. Please try again.");
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(userId, otp);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Invalid verification code");
    }
    // If successful, user will be redirected by auth context
  };

  const handleResendOTP = async () => {
    if (!email) {
      setError("Email is required to resend code.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    const result = await resendOTP(email);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage("Verification code resent! Check your email.");
    } else {
      setError(result.error || "Failed to resend code");
    }
  };

  const handleBackToCredentials = () => {
    setAuthStep("credentials");
    setOtp("");
    setError(null);
    setSuccessMessage(null);
  };

  // Render OTP verification screen
  if (authStep === "otp") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/classynclogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Back Button */}
            <Pressable onPress={handleBackToCredentials} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary} />
            </Pressable>

            {/* Icon */}
            <View style={styles.otpIconContainer}>
              <Ionicons name="mail-outline" size={48} color={Colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to{"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="key-outline" size={20} color={Colors.iconColor} />
              </View>
              <TextInput
                placeholder="Enter verification code"
                placeholderTextColor={Colors.mutedText}
                keyboardType="default"
                autoCapitalize="none"
                style={styles.input}
                onChangeText={setOtp}
                value={otp}
                maxLength={50}
              />
            </View>

            {/* Success Message */}
            {successMessage && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.warning} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verify Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                isLoading && styles.primaryBtnDisabled,
              ]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify Email</Text>
              )}
            </Pressable>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <Pressable onPress={handleResendOTP} disabled={isLoading}>
                <Text style={styles.resendLink}>Resend</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Render credentials screen (login/signup)
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/classynclogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Sign up to get started with ClassSync"
              : "Sign in to continue to ClassSync"}
          </Text>

          {/* Username Input (Only for Sign Up) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrap}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={Colors.iconColor}
                />
              </View>
              <TextInput
                placeholder="Username"
                placeholderTextColor={Colors.mutedText}
                autoCapitalize="words"
                style={styles.input}
                onChangeText={setUsername}
                value={username}
              />
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.iconColor} />
            </View>
            <TextInput
              placeholder="Email"
              placeholderTextColor={Colors.mutedText}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              onChangeText={setEmail}
              value={email}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.iconColor}
              />
            </View>
            <TextInput
              placeholder="Password"
              placeholderTextColor={Colors.mutedText}
              secureTextEntry={!showPassword}
              style={styles.input}
              onChangeText={setPassword}
              value={password}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={Colors.iconColor}
              />
            </Pressable>
          </View>

          {/* Confirm Password Input (Only for Sign Up) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.iconColor}
                />
              </View>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={Colors.mutedText}
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={Colors.iconColor}
                />
              </Pressable>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.warning} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Forgot Password */}
          {!isSignUp && (
            <Pressable style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          )}

          {/* Primary Button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
              isLoading && styles.primaryBtnDisabled,
            ]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? "Sign Up" : "Login"}
              </Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Switch Auth Mode */}
          <Pressable
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            style={styles.switchContainer}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <Text style={styles.switchTextBold}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    padding: 4,
  },
  otpIconContainer: {
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.title,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedText,
    marginBottom: 24,
    textAlign: "center",
  },
  emailText: {
    fontWeight: "600",
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.uiBackground,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.navBackground,
  },
  inputIconWrap: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  eyeButton: {
    padding: 14,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  successText: {
    color: Colors.primary,
    fontSize: 13,
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: Colors.warning,
    fontSize: 13,
    flex: 1,
  },
  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.navBackground,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.mutedText,
    fontSize: 13,
  },
  switchContainer: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    color: Colors.mutedText,
  },
  switchTextBold: {
    color: Colors.secondary,
    fontWeight: "700",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: Colors.mutedText,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: "700",
  },
});