import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { PaperProvider } from "react-native-paper";


function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoadingUser) return;

    // Safely get the current group
    const currentGroup = segments[0] as string | undefined;

    const inAuthGroup = currentGroup === "(auth)" || currentGroup === "auth";
    const inTabsGroup = currentGroup === "(tabs)" || currentGroup === "tabs";
    const inImportGroup = currentGroup === "(import)" || currentGroup === "import"; 

    // FIX: Cast segments to 'any' or 'string[]' to verify length without TS errors
    const isRootIndex = (segments as string[]).length === 0;

    // --- LOGIC START ---

    // A. If NOT logged in
    if (!user) {
      if (inTabsGroup || inImportGroup) {
        router.replace("/");
      }
    }

    // B. If LOGGED IN
    if (user) {
      // Only redirect to dashboard if user is on Login/Signup OR the Root Landing page
      if (inAuthGroup || isRootIndex) {
        // 'as any' fixes the path type error if your routes aren't auto-generated yet
        router.replace("/(tabs)/home" as any); 
      }
    }
    
  }, [user, isLoadingUser, segments, router]); 

  if (isLoadingUser) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#35BDA7" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <RouteGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(import)" />
          </Stack>
        </RouteGuard>
      </AuthProvider>
    </PaperProvider>
  );
}