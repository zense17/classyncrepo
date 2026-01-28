import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/colors";

const Home = () => {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Hi, Juan!</Text>

          <View style={styles.headerRight}>
            <View style={styles.bellWrap}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={Colors.secondary}
              />
              <View style={styles.bellDot} />
            </View>
          </View>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: "#A3C51E" }]}>8</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: "#28C76F" }]}>3</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>This Week’s Priority</Text>

          <View style={styles.priorityRow}>
            <View style={styles.priorityLeft}>
              <Dot color="#B91C1C" />
              <Text style={styles.priorityText}>Critical Priority</Text>
            </View>
            <Text style={styles.priorityCount}>1</Text>
          </View>

          <View style={styles.priorityRow}>
            <View style={styles.priorityLeft}>
              <Dot color="#EF4444" />
              <Text style={styles.priorityText}>High Priority</Text>
            </View>
            <Text style={styles.priorityCount}>3</Text>
          </View>

          <View style={styles.priorityRow}>
            <View style={styles.priorityLeft}>
              <Dot color="#F59E0B" />
              <Text style={styles.priorityText}>Medium Priority</Text>
            </View>
            <Text style={styles.priorityCount}>3</Text>
          </View>

          <View style={styles.priorityRow}>
            <View style={styles.priorityLeft}>
              <Dot color="#22C55E" />
              <Text style={styles.priorityText}>Low Priority</Text>
            </View>
            <Text style={styles.priorityCount}>1</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>View All Tasks</Text>
          </Pressable>
        </View>

        {/* Schedule Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s Schedule</Text>

          <View style={styles.scheduleItem}>
            <View
              style={[styles.scheduleAccent, { backgroundColor: "#4B8BFF" }]}
            />
            <View style={styles.scheduleInfo}>
              <Text style={styles.classCode}>ENG 101</Text>
              <Text style={styles.classMeta}>
                9:00 AM - 10:30 AM Room ECB - 15
              </Text>
            </View>
            <View style={styles.clockWrap}>
              <Ionicons
                name="time-outline"
                size={18}
                color={Colors.secondary}
              />
            </View>
          </View>

          <View style={styles.scheduleItem}>
            <View
              style={[styles.scheduleAccent, { backgroundColor: "#28C76F" }]}
            />
            <View style={styles.scheduleInfo}>
              <Text style={styles.classCode}>CS 124</Text>
              <Text style={styles.classMeta}>
                1:00 PM - 4:00 PM Room ECB - 201
              </Text>
            </View>
            <View style={styles.clockWrap}>
              <Ionicons
                name="time-outline"
                size={18}
                color={Colors.secondary}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>

          <View style={styles.actionsRow}>
            <ActionCard
              title="Import COR"
              icon="cloud-upload-outline"
              bg="#8B7CF6"
              onPress={() => router.push("/(import)/option")}
            />
            <ActionCard
              title="My Curriculum"
              icon="document-text-outline"
              bg="#20C997"
              onPress={() => console.log("Curriculum")}
            />
          </View>
        </View>

        {/* Bottom spacing so FAB doesn't cover content */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.pressedFab]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
};

export default Home;

/* ---------- Small Components ---------- */

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function ActionCard({ 
  title, 
  icon, 
  bg, 
  onPress 
}: { 
  title: string; 
  icon: any; 
  bg: string; 
  onPress?: () => void; // Make optional 
}) {
  return (
    <Pressable
      onPress={onPress} // Add this
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </Pressable>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 50,
    marginTop: 30,
  },
  greeting: {
    fontSize: 35,
    color: Colors.title,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellWrap: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: "#E9FFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellDot: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "#EF4444",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 34,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F8F",
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  hr: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#6B8F8F",
    marginBottom: 8,
  },

  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  priorityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  priorityText: {
    color: "#244D4D",
    fontSize: 13,
  },
  priorityCount: {
    color: "#244D4D",
    fontSize: 13,
    fontWeight: "700",
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  cardTitle: {
    fontSize: 14,
    marginBottom: 10,
    color: "#244D4D",
  },

  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3FAFA",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  scheduleAccent: {
    width: 4,
    height: 44,
    borderRadius: 99,
  },
  scheduleInfo: {
    flex: 1,
  },
  classCode: {
    fontSize: 12.5,
    color: "#244D4D",
  },
  classMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B8F8F",
  },
  clockWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#E9FFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#F3FAFA",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    color: "#244D4D",
    fontWeight: "700",
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  pressed: {
    opacity: 0.85,
  },
  pressedFab: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
