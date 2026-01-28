import { Stack } from "expo-router";
import React from "react";

export default function ImportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
        animation: "slide_from_right", 
      }}
    >
      {/* 1. The Options Menu */}
      <Stack.Screen name="option" />

      {/* 2. The Camera Screen */}
      <Stack.Screen 
        name="scan" 
        options={{
          animation: "fade", 
          gestureEnabled: false, 
        }}
      />
      <Stack.Screen 
        name="loading" 
        options={{
          animation: "fade", // Smooth fade for the loading state
          gestureEnabled: false // Prevent going back during loading
        }}
      />

      {/* 4. Verification Screen */}
      <Stack.Screen name="verify" />
    </Stack>
  );
}