import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth-context";
import { getCourses, parseTimeString } from "@/lib/database";
import { scheduleCourseNotifications } from "@/lib/scheduler";
import { getPendingTasksSorted, getTaskStats } from "@/lib/taskService";
import * as Notifications from "expo-notifications";
import { readNotificationIds } from "@/lib/notificationStore";
import dayjs from "dayjs";

// 1. CONFIG: Allow notifications to show while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Day mapping for schedule filtering
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

// Color palette for courses
const COURSE_COLORS = [
  { primary: "#3B82F6", light: "#DBEAFE" },
  { primary: "#10B981", light: "#D1FAE5" },
  { primary: "#F59E0B", light: "#FEF3C7" },
  { primary: "#EF4444", light: "#FEE2E2" },
  { primary: "#8B5CF6", light: "#EDE9FE" },
  { primary: "#EC4899", light: "#FCE7F3" },
  { primary: "#14B8A6", light: "#CCFBF1" },
  { primary: "#F97316", light: "#FFEDD5" },
];

function getCourseColor(courseCode: string) {
  const hash = courseCode
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

interface TodayClass {
  code: string;
  title: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
}

const Home = () => {
  const router = useRouter();
  const { user } = useAuth();

  // State for tasks
  const [taskStats, setTaskStats] = useState<any>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // State for schedule
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  // State for FAB menu
  const [showFabMenu, setShowFabMenu] = useState(false);

  // State for the Bell Dot
  const [hasUnread, setHasUnread] = useState(false);

  // 2. PERMISSIONS: Request on mount
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        // Silent fail or alert user
      }
    }
    requestPermissions();
  }, []);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadData();
      } else {
        setIsLoadingTasks(false);
        setIsLoadingSchedule(false);
      }
    }, [user]),
  );

  // Unified Loading Function
  const loadData = async () => {
    if (!user) return;

    try {
      // --- 1. Load Task Stats (For the Dashboard Cards) ---
      const stats = await getTaskStats(user.$id);
      setTaskStats(stats);
      setIsLoadingTasks(false);

      // --- 2. Load Schedule (For Today's Classes) ---
      const courses = await getCourses(user.$id);

      // Run Scheduler
      try {
        await scheduleCourseNotifications(courses);
      } catch (err) {
        console.log("Scheduler error (ignore if testing on simulator):", err);
      }

      const today = dayjs();
      const todayDayNum = today.day();

      const classesToday: TodayClass[] = [];
      let calculatedUnreadCount = 0;

      // --- 3. Calculate Unread TASKS ---
      const pendingTasks = await getPendingTasksSorted(user.$id);
      pendingTasks.forEach((task) => {
        const notifId = `task-${task.$id}`;
        if (!readNotificationIds.has(notifId)) {
          calculatedUnreadCount++;
        }
      });

      // --- 4. Process Classes & Calculate Unread CLASSES ---
      for (const course of courses) {
        const schedules = parseTimeString(course.time);

        for (const schedule of schedules) {
          for (const dayStr of schedule.days) {
            const dayNum = DAY_MAP[dayStr];

            if (dayNum === todayDayNum) {
              classesToday.push({
                code: course.code,
                title: course.title,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                room: course.room,
                color: getCourseColor(course.code).primary,
              });

              const notifId = `class-${course.$id}-${schedule.startTime}`;
              if (!readNotificationIds.has(notifId)) {
                calculatedUnreadCount++;
              }
            }
          }
        }
      }

      setHasUnread(calculatedUnreadCount > 0);

      classesToday.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.startTime);
        const timeB = parseTimeToMinutes(b.startTime);
        return timeA - timeB;
      });

      setTodayClasses(classesToday);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoadingSchedule(false);
      setIsLoadingTasks(false);
    }
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const pendingCount = taskStats ? taskStats.pending + taskStats.inProgress : 0;
  const completedCount = taskStats?.completed || 0;

  const handleAddTask = () => {
    setShowFabMenu(false);
    router.push("/(tasks)/addTask");
  };

  const handleAddClass = () => {
    setShowFabMenu(false);
    router.push("/(import)/addClass");
  };

  const handleNotificationPress = () => {
    try {
      router.push("/(notifications)/notifications");
    } catch (error) {
      router.push("/notifications");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.navBackground}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingLabel}>
              {dayjs().format("dddd, MMM D")}
            </Text>
            <Text style={styles.greeting}>Hi, {user?.name || "there"}!</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={handleNotificationPress}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={Colors.secondary}
              />
              {hasUnread && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          {isLoadingTasks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <View style={[styles.statIconBadge, { backgroundColor: "#F0FFF0" }]}>
                    <Ionicons name="hourglass-outline" size={16} color="#A3C51E" />
                  </View>
                  <Text style={[styles.statNumber, { color: "#7DA315" }]}>
                    {pendingCount}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <View style={[styles.statIconBadge, { backgroundColor: "#EDFCF2" }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#28C76F" />
                  </View>
                  <Text style={[styles.statNumber, { color: "#1B9A52" }]}>
                    {completedCount}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>

              <View style={styles.hr} />

              <Text style={styles.sectionTitle}>{"This Week's Priority"}</Text>

              <View style={styles.priorityList}>
                <PriorityRow color="#B91C1C" label="Critical" count={taskStats?.critical || 0} />
                <PriorityRow color="#EF4444" label="High" count={taskStats?.high || 0} />
                <PriorityRow color="#F59E0B" label="Medium" count={taskStats?.medium || 0} />
                <PriorityRow color="#22C55E" label="Low" count={taskStats?.low || 0} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push("/(tabs)/tasks")}
              >
                <Ionicons name="arrow-forward" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>View All Tasks</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.calendarDot} />
              <Text style={styles.cardTitle}>{"Today's Schedule"}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{dayjs().format("ddd D")}</Text>
            </View>
          </View>

          {isLoadingSchedule ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : todayClasses.length === 0 ? (
            <View style={styles.emptySchedule}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={Colors.mutedText}
                />
              </View>
              <Text style={styles.emptyTitle}>No classes today</Text>
              <Text style={styles.emptySubtext}>Enjoy your free time!</Text>
            </View>
          ) : (
            todayClasses.map((classItem, index) => (
              <View
                key={`${classItem.code}-${index}`}
                style={styles.scheduleItem}
              >
                <View
                  style={[
                    styles.scheduleAccent,
                    { backgroundColor: classItem.color },
                  ]}
                />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.classCode}>{classItem.code}</Text>
                  <View style={styles.classMetaRow}>
                    <Ionicons name="time-outline" size={11} color="#8FAFAF" style={{ marginRight: 3 }} />
                    <Text style={styles.classMeta}>
                      {classItem.startTime} – {classItem.endTime}
                    </Text>
                    <Text style={styles.classMetaDivider}>·</Text>
                    <Ionicons name="location-outline" size={11} color="#8FAFAF" style={{ marginRight: 2 }} />
                    <Text style={styles.classMeta}>{classItem.room}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.clockWrap,
                    { backgroundColor: `${classItem.color}14` },
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={classItem.color}
                  />
                </View>
              </View>
            ))
          )}

          {todayClasses.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/(tabs)/calendar")}
            >
              <Text style={styles.secondaryBtnText}>View Full Schedule</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.secondary} style={{ marginLeft: 4 }} />
            </Pressable>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={{ height: 12 }} />
          <View style={styles.actionsRow}>
            <ActionCard
              title="Import COR"
              icon="cloud-upload-outline"
              bg="#8B7CF6"
              lightBg="#F0EDFE"
              onPress={() => router.push("/(import)/option")}
            />
            <ActionCard
              title="View Tasks"
              icon="list-outline"
              bg="#20C997"
              lightBg="#E6FAF4"
              onPress={() => router.push("/(tabs)/tasks")}
            />
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB Menu */}
      {showFabMenu && (
        <Pressable
          style={styles.fabOverlay}
          onPress={() => setShowFabMenu(false)}
        />
      )}
      {showFabMenu && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={handleAddTask}
            activeOpacity={0.8}
          >
            <View style={styles.fabLabelPill}>
              <Text style={styles.fabMenuText}>Task</Text>
            </View>
            <View style={[styles.fabMenuIcon, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons
                name="format-list-checks"
                size={20}
                color="#4CAF50"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={handleAddClass}
            activeOpacity={0.8}
          >
            <View style={styles.fabLabelPill}>
              <Text style={styles.fabMenuText}>Class</Text>
            </View>
            <View style={[styles.fabMenuIcon, { backgroundColor: "#E3F2FD" }]}>
              <MaterialCommunityIcons
                name="calendar-edit"
                size={20}
                color="#2196F3"
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Add Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.pressedFab,
          showFabMenu && styles.fabActive,
        ]}
        onPress={() => setShowFabMenu(!showFabMenu)}
      >
        <Ionicons name={showFabMenu ? "close" : "add"} size={28} color="#fff" />
      </Pressable>
    </View>
  );
};

export default Home;

/* ---------- Small Components ---------- */

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function PriorityRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View style={styles.priorityRow}>
      <View style={styles.priorityLeft}>
        <View style={[styles.priorityDot, { backgroundColor: color }]} />
        <Text style={styles.priorityText}>{label}</Text>
      </View>
      <View style={[styles.priorityCountBadge, { backgroundColor: `${color}12` }]}>
        <Text style={[styles.priorityCount, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function ActionCard({
  title,
  icon,
  bg,
  lightBg,
  onPress,
}: {
  title: string;
  icon: any;
  bg: string;
  lightBg?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        lightBg ? { backgroundColor: lightBg } : {},
        pressed && styles.pressed,
      ]}
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
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 14 },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    marginTop: 28,
  },
  greetingLabel: {
    fontSize: 13,
    color: "#8FAFAF",
    fontWeight: "500",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.title,
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#EEF9F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(52, 199, 89, 0.08)",
  },
  bellDot: {
    position: "absolute",
    right: 11,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#EEF9F9",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0D3B3B",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 4 },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statNumber: { fontSize: 30, fontWeight: "800", letterSpacing: -1 },
  statLabel: {
    fontSize: 11.5,
    color: "#8FAFAF",
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 8,
  },
  hr: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginTop: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11.5,
    color: "#8FAFAF",
    marginBottom: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Priority */
  priorityList: { gap: 6 },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  priorityLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  priorityDot: { width: 8, height: 8, borderRadius: 99 },
  priorityText: { color: "#2D5A5A", fontSize: 13.5, fontWeight: "500" },
  priorityCountBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  priorityCount: { fontSize: 12.5, fontWeight: "700" },

  /* Buttons */
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#34C759",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#34C759",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 13.5, letterSpacing: 0.2 },
  secondaryBtn: {
    marginTop: 14,
    backgroundColor: "transparent",
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "rgba(52, 199, 89, 0.2)",
  },
  secondaryBtnText: {
    color: Colors.secondary,
    fontWeight: "600",
    fontSize: 12.5,
  },

  /* Schedule card header */
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
  cardTitle: {
    fontSize: 14.5,
    color: "#2D5A5A",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  dateBadge: {
    backgroundColor: "#EEF9F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 11.5,
    color: Colors.secondary,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  /* Empty schedule */
  emptySchedule: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 6,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F3FAFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    color: "#5A8080",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#A0BFBF",
    fontSize: 12,
  },
  emptyText: { color: Colors.mutedText, fontSize: 13 },

  /* Schedule items */
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FBFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  scheduleAccent: { width: 3.5, height: 40, borderRadius: 99 },
  scheduleInfo: { flex: 1 },
  classCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#244D4D",
    letterSpacing: -0.1,
  },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  classMeta: {
    fontSize: 11,
    color: "#8FAFAF",
    fontWeight: "500",
  },
  classMetaDivider: {
    fontSize: 11,
    color: "#B0CCCC",
    marginHorizontal: 5,
  },
  clockWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Quick Actions */
  actionsRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: "#F3FAFA",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: "#2D5A5A",
    fontWeight: "600",
    textAlign: "center",
  },

  /* FAB */
  fabOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  fabMenu: {
    position: "absolute",
    right: 20,
    bottom: 92,
    alignItems: "flex-end",
    gap: 14,
  },
  fabMenuItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  fabLabelPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.title,
  },
  fabMenuIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabActive: {
    backgroundColor: Colors.secondary,
    transform: [{ rotate: "45deg" }],
  },
  pressed: { opacity: 0.85 },
  pressedFab: { transform: [{ scale: 0.96 }], opacity: 0.9 },

  // Test Button Style (preserved)
  testButton: {
    marginTop: 20,
    backgroundColor: "#FF6B6B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  testButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});