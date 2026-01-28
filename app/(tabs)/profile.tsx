import { useAuth } from "@/lib/auth-context";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";

export default function Index() {
    const { signOut } = useAuth();
  return (
    <View style={styles.view}>
      <Text>index</Text>
      <Button mode="text" onPress={signOut} icon={"logout"}>
        {""}
        Sign Out {""}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});