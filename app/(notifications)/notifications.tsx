import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getCourses, parseTimeString } from "@/lib/database";
import { getPendingTasksSorted } from "@/lib/taskService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// 👇 NEW: Import the shared store
import { readNotificationIds } from "@/lib/notificationStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type NotificationType =
  | "task_critical"
  | "task_overdue"
  | "task_due_today"
  | "class_upcoming"
  | "class_now"
  | "task_completed"
  | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  priority?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  data?: any;
  read?: boolean;
  category: "today" | "yesterday" | "this_week" | "earlier";
}

const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Sunday: 0,
  Mon: 1,
  Monday: 1,
  M: 1,
  Tue: 2,
  Tuesday: 2,
  T: 2,
  Wed: 3,
  Wednesday: 3,
  W: 3,
  Thu: 4,
  Th: 4,
  Thursday: 4,
  Fri: 5,
  Friday: 5,
  F: 5,
  Sat: 6,
  Saturday: 6,
  S: 6,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "unread" | "tasks" | "reminders"
  >("all");

  // Force update UI when we focus (to sync with Home)
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user]),
  );

  const loadNotifications = async (showRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (showRefresh) setIsRefreshing(true);

    try {
      const generatedNotifications: Notification[] = [];
      const tasks = await getPendingTasksSorted(user.$id);
      const courses = await getCourses(user.$id);

      const getCategory = (
        date: dayjs.Dayjs,
      ): "today" | "yesterday" | "this_week" | "earlier" => {
        const today = dayjs().startOf("day");
        if (date.isSame(today, "day")) return "today";
        if (date.isSame(today.subtract(1, "day"), "day")) return "yesterday";
        if (date.isAfter(today.subtract(7, "day"))) return "this_week";
        return "earlier";
      };

      // 1. Task Logic
      tasks.forEach((task) => {
        const isCritical = task.priority === "Critical";
        const notifId = `task-${task.$id}`;

        generatedNotifications.push({
          id: notifId,
          type: isCritical ? "task_critical" : "task_due_today",
          title: isCritical ? "Critical Priority" : "Task Update",
          message: task.title,
          time: dayjs(task.dueDate).fromNow(),
          priority: task.priority,
          icon: isCritical ? "alert-circle" : "document-text",
          color: isCritical ? Colors.warning : Colors.primary,
          bgColor: isCritical ? "#FFF1F2" : Colors.navBackground,
          category: getCategory(dayjs(task.dueDate)),
          // Check shared store
          read: readNotificationIds.has(notifId),
        });
      });

      // 2. Course Logic
      const today = dayjs();
      const todayDayNum = today.day();

      courses.forEach((course) => {
        const schedules = parseTimeString(course.time);

        schedules.forEach((schedule) => {
          const isToday = schedule.days.some((d) => DAY_MAP[d] === todayDayNum);
          if (isToday) {
            const notifId = `class-${course.$id}-${schedule.startTime}`;
            generatedNotifications.push({
              id: notifId,
              type: "class_upcoming",
              title: "Class Today",
              message: `${course.code} • ${schedule.startTime} • ${course.room}`,
              time: schedule.startTime,
              priority: "Schedule",
              icon: "school",
              color: "#8B5CF6",
              bgColor: "#F3E8FF",
              category: "today",
              // Check shared store
              read: readNotificationIds.has(notifId),
            });
          }
        });
      });

      generatedNotifications.sort((a, b) => {
        if (a.read === b.read) {
          if (a.category === "today" && b.category !== "today") return -1;
          return 0;
        }
        return a.read ? 1 : -1;
      });

      setNotifications(generatedNotifications);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = (id: string) => {
    readNotificationIds.add(id); // Update shared store
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach((n) => readNotificationIds.add(n.id)); // Update shared store
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    // Optional: Clearing might imply marking as read or just deleting logic
    setNotifications([]);
  };

  const handleItemPress = (item: Notification) => {
    handleMarkAsRead(item.id);
    setTimeout(() => {
      if (item.type.startsWith("task")) {
        router.push("/(tabs)/tasks");
      } else {
        router.push("/(tabs)/calendar");
      }
    }, 50);
  };

  const filteredData = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.read;
      if (filter === "tasks") return n.type.startsWith("task_");
      if (filter === "reminders") return n.type.startsWith("class_");
      return true;
    });
  }, [notifications, filter]);

  const groupedData = useMemo(() => {
    return {
      today: filteredData.filter((n) => n.category === "today"),
      yesterday: filteredData.filter((n) => n.category === "yesterday"),
      this_week: filteredData.filter((n) => n.category === "this_week"),
      earlier: filteredData.filter((n) => n.category === "earlier"),
    };
  }, [filteredData]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={styles.markReadBtn}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClearAll} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.warning} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterInner}
        >
          {["all", "unread", "tasks", "reminders"].map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilter(t as any)}
              style={[styles.chip, filter === t && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, filter === t && styles.chipTextActive]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        ) : (
          Object.entries(groupedData).map(
            ([title, data]) =>
              data.length > 0 && (
                <View key={title} style={styles.section}>
                  <Text style={styles.sectionHeader}>
                    {title.replace("_", " ")}
                  </Text>
                  {data.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      onPress={() => handleItemPress(item)}
                    />
                  ))}
                </View>
              ),
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        { backgroundColor: item.read ? "#FFFFFF" : "#F0FDFA" },
      ]}
    >
      <View style={[styles.colorStrip, { backgroundColor: item.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons
              name={item.icon as any}
              size={18}
              color={item.color}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.cardTitle,
                {
                  fontWeight: item.read ? "500" : "700",
                  color: item.read ? "#64748B" : Colors.title,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text
          style={[
            styles.cardMessage,
            { color: item.read ? "#94A3B8" : "#334155" },
          ]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <Text style={styles.cardTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9FFFF" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#E9FFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.title, flex: 1, marginLeft: 16, textAlign: 'left' },
  backBtn: { padding: 4 },
  headerRight: { flexDirection: "row", gap: 16 },
  markReadBtn: { padding: 4 },
  trashBtn: { padding: 4 },
  filterBar: { marginVertical: 12 },
  filterInner: { paddingHorizontal: 20, gap: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: "#64748B", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "white" },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  colorStrip: { width: 5, height: "100%" },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: { fontSize: 15, flex: 1 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  cardMessage: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  cardTime: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: {
    marginTop: 16,
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },
});
