import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors"

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.navBackground,
          paddingTop: 10,
          height: 75,
        },
        tabBarActiveTintColor: Colors.iconColorFocused,
        tabBarInactiveTintColor: Colors.iconColor,
      }}
    >
      <Tabs.Screen
        name="home" 
        options={{
          title: "Home", 
          tabBarIcon: ({ focused }) => (
            <Ionicons
              size={24}
              name={focused ? "home" : "home-outline"}
              color={focused ? Colors.iconColorFocused : Colors.iconColor}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              size={24}
              name={focused ? "grid" : "grid-outline"}
              color={focused ? Colors.iconColorFocused : Colors.iconColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              size={24}
              name={focused ? "calendar" : "calendar-outline"}
              color={focused ? Colors.iconColorFocused : Colors.iconColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              size={24}
              name={focused ? "person" : "person-outline"}
              color={focused ? Colors.iconColorFocused : Colors.iconColor}
            />
          ),
        }}
      />
    </Tabs>
  );
}