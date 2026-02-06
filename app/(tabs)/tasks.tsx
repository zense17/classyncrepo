import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import {
  getPendingTasksSorted,
  getTasksByStatus,
  completeTask,
  deleteTask,
  reopenTask,
  recalculateAllPriorities,
  getTaskStats,
  Task,
} from "@/lib/taskService";
import {
  getPriorityStyles,
  getPriorityScore,
  formatEstimatedTime,
  Priority,
} from "@/lib/taskPriority";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Colors } from "@/constants/colors";

dayjs.extend(relativeTime);

const FILTERS = ["All Tasks", "Critical", "High", "Medium", "Low", "Completed"];

export default function SmartTasksScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState("All Tasks");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [user]),
  );

  const loadTasks = async (showRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);

    try {
      await recalculateAllPriorities(user.$id);
      const fetchedTasks = await getPendingTasksSorted(user.$id);
      setTasks(fetchedTasks);

      // Fetch completed tasks
      const fetchedCompleted = await getTasksByStatus(user.$id, "completed");
      setCompletedTasks(fetchedCompleted);

      const taskStats = await getTaskStats(user.$id);
      setStats(taskStats);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      Alert.alert("Error", "Failed to load tasks");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => loadTasks(true);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      loadTasks();
    } catch (error) {
      console.error("Failed to complete task:", error);
      Alert.alert("Error", "Failed to complete task");
    }
  };

  const handleReopenTask = async (taskId: string) => {
    try {
      await reopenTask(taskId);
      loadTasks();
    } catch (error) {
      console.error("Failed to reopen task:", error);
      Alert.alert("Error", "Failed to reopen task");
    }
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    Alert.alert("Delete Task", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(taskId);
            loadTasks();
          } catch (error) {
            Alert.alert("Error", "Failed to delete task");
          }
        },
      },
    ]);
  };

  const formatDueDate = (
    dueDate: string,
  ): { text: string; isOverdue: boolean; isToday: boolean } => {
    const due = dayjs(dueDate);
    const today = dayjs().startOf("day");
    const diffDays = due.diff(today, "day");

    if (diffDays < 0) {
      return {
        text: `Overdue (${Math.abs(diffDays)}d ago)`,
        isOverdue: true,
        isToday: false,
      };
    } else if (diffDays === 0) {
      return { text: "Due Today", isOverdue: false, isToday: true };
    } else if (diffDays === 1) {
      return { text: "Tomorrow", isOverdue: false, isToday: false };
    } else if (diffDays <= 7) {
      return { text: due.format("dddd"), isOverdue: false, isToday: false };
    } else {
      return {
        text: due.format("MMM D, YYYY"),
        isOverdue: false,
        isToday: false,
      };
    }
  };

  const formatCompletedDate = (completedAt: string | undefined): string => {
    if (!completedAt) return "";
    const completed = dayjs(completedAt);
    const today = dayjs().startOf("day");
    const diffDays = today.diff(completed.startOf("day"), "day");

    if (diffDays === 0) {
      return "Completed today";
    } else if (diffDays === 1) {
      return "Completed yesterday";
    } else if (diffDays <= 7) {
      return `Completed ${diffDays} days ago`;
    } else {
      return `Completed ${completed.format("MMM D")}`;
    }
  };

  const processedTasks = useMemo(() => {
    // If viewing completed tasks
    if (activeFilter === "Completed") {
      return [...completedTasks].sort((a, b) => {
        // Sort by completion date, most recent first
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    let filtered = tasks;

    if (activeFilter !== "All Tasks") {
      filtered = tasks.filter((t) => t.priority === activeFilter);
    }

    return [...filtered].sort((a, b) => {
      const scoreA = getPriorityScore(a.priority as Priority);
      const scoreB = getPriorityScore(b.priority as Priority);

      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, completedTasks, activeFilter]);

  // Navigate back to home tab
  const handleGoBack = () => {
    router.replace("/(tabs)/home");
  };

  const renderTaskCard = ({ item }: { item: Task }) => {
    const stylesConfig = getPriorityStyles(item.priority as Priority);
    const dueDateInfo = formatDueDate(item.dueDate);
    const isCompleted = item.status === "completed";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isCompleted ? "#F5F5F5" : stylesConfig.cardBg },
          isCompleted && styles.completedCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.priorityBadge}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isCompleted
                    ? "#9E9E9E"
                    : stylesConfig.accent,
                },
              ]}
            />
            <Text
              style={[styles.priorityText, isCompleted && styles.completedText]}
            >
              {isCompleted
                ? "COMPLETED"
                : `${item.priority.toUpperCase()} PRIORITY`}
            </Text>
            {item.isMajorSubject && !isCompleted && (
              <View style={styles.majorBadge}>
                <Text style={styles.majorBadgeText}>⭐</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              isCompleted && styles.deleteButtonCompleted,
            ]}
            onPress={() => handleDeleteTask(item.$id!, item.title)}
          >
            <Feather name="trash-2" size={14} color="white" />
          </TouchableOpacity>
        </View>

        <Text
          style={[styles.taskTitle, isCompleted && styles.completedTaskTitle]}
        >
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={isCompleted ? "#9E9E9E" : "#666"}
            />
            <Text
              style={[styles.metaText, isCompleted && styles.completedMetaText]}
            >
              {formatEstimatedTime(item.estimatedMinutes)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name={
                isCompleted ? "check-circle-outline" : "calendar-blank-outline"
              }
              size={16}
              color={
                isCompleted
                  ? "#4CAF50"
                  : dueDateInfo.isOverdue
                    ? "#D32F2F"
                    : dueDateInfo.isToday
                      ? "#FF9800"
                      : "#666"
              }
            />
            <Text
              style={[
                styles.metaText,
                isCompleted && styles.completedDateText,
                !isCompleted && dueDateInfo.isOverdue && styles.overdueText,
                !isCompleted && dueDateInfo.isToday && styles.todayText,
              ]}
            >
              {isCompleted
                ? formatCompletedDate(item.completedAt)
                : dueDateInfo.text}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.cardFooter}>
          <View style={styles.tagsContainer}>
            <View
              style={[styles.courseTag, isCompleted && styles.completedTag]}
            >
              <Text
                style={[
                  styles.courseTagText,
                  isCompleted && styles.completedTagText,
                ]}
              >
                {item.courseCode}
              </Text>
            </View>
            <View
              style={[
                styles.typeTag,
                {
                  backgroundColor: isCompleted ? "#E0E0E0" : stylesConfig.tagBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: isCompleted ? "#757575" : stylesConfig.tagText },
                ]}
              >
                {item.taskType}
              </Text>
            </View>
            <View
              style={[
                styles.difficultyTag,
                {
                  backgroundColor: isCompleted
                    ? "#E0E0E0"
                    : item.difficulty === "hard"
                      ? "#FFEBEE"
                      : item.difficulty === "medium"
                        ? "#FFF8E1"
                        : "#E8F5E9",
                },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  {
                    color: isCompleted
                      ? "#757575"
                      : item.difficulty === "hard"
                        ? "#C62828"
                        : item.difficulty === "medium"
                          ? "#F57F17"
                          : "#2E7D32",
                  },
                ]}
              >
                {item.difficulty}
              </Text>
            </View>
          </View>

          {isCompleted ? (
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={() => handleReopenTask(item.$id!)}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.checkButton}
              onPress={() => handleCompleteTask(item.$id!)}
            >
              <MaterialCommunityIcons name="check" size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name={
          activeFilter === "Completed"
            ? "checkbox-marked-circle-outline"
            : "checkbox-blank-circle-outline"
        }
        size={64}
        color="#B0BEC5"
      />
      <Text style={styles.emptyTitle}>
        {activeFilter === "Completed"
          ? "No Completed Tasks"
          : activeFilter === "All Tasks"
            ? "No Tasks Yet"
            : `No ${activeFilter} Priority Tasks`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === "Completed"
          ? "Tasks you complete will appear here"
          : activeFilter === "All Tasks"
            ? "Tap the + button to add your first task"
            : "Great job! No tasks with this priority level"}
      </Text>
      {activeFilter === "All Tasks" && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push("/(tasks)/addTask")}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Add Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#26A69A" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.title} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Smart Tasks</Text>
          <Text style={styles.headerSubtitle}>AI-powered priority ranking</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(tasks)/addTask")}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

  

      {/* Horizontal Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            const isCompletedFilter = filter === "Completed";
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  isActive && styles.activeFilterPill,
                  isCompletedFilter && !isActive && styles.completedFilterPill,
                  isCompletedFilter &&
                    isActive &&
                    styles.activeCompletedFilterPill,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                {isCompletedFilter && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={isActive ? "#FFFFFF" : "#666"}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.activeFilterText,
                    isCompletedFilter &&
                      !isActive &&
                      styles.completedFilterText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      <FlatList
        data={processedTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.$id!}
        contentContainerStyle={[
          styles.listContent,
          processedTasks.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#26A69A"]}
            tintColor="#26A69A"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#666" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn:{
    padding: 4,
  },
  backButton: {
    backgroundColor: "#4DB6AC",
    borderRadius: 50,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    backgroundColor: "#26A69A",
    borderRadius: 50,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#000" },
  headerSubtitle: { fontSize: 13, color: "#666", marginTop: 1 },

  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 16,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statNumber: { fontSize: 14, fontWeight: "700", color: "#333" },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  overdueStatContainer: {
    marginLeft: "auto",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueStatText: { fontSize: 12, color: "#C62828", fontWeight: "600" },

  filterContainer: { height: 48, marginBottom: 12 },
  filterScroll: { paddingHorizontal: 18, gap: 10 },
  filterPill: {
    backgroundColor: "#B2DFDB",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  activeFilterPill: { backgroundColor: "#26A69A" },
  completedFilterPill: { backgroundColor: "#E0E0E0" },
  activeCompletedFilterPill: { backgroundColor: "#757575" },
  filterText: { color: "#004D40", fontWeight: "600", fontSize: 13 },
  activeFilterText: { color: "#FFFFFF" },
  completedFilterText: { color: "#666" },

  listContent: { paddingHorizontal: 18, paddingBottom: 100 },
  emptyListContent: { flexGrow: 1 },

  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  completedCard: { opacity: 0.85 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  priorityText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  completedText: { color: "#9E9E9E" },
  majorBadge: { marginLeft: 4 },
  majorBadgeText: { fontSize: 10 },
  deleteButton: { backgroundColor: "#EF5350", padding: 8, borderRadius: 12 },
  deleteButtonCompleted: { backgroundColor: "#BDBDBD" },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
  },
  completedTaskTitle: { color: "#757575", textDecorationLine: "line-through" },
  metaRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#666", fontSize: 13 },
  completedMetaText: { color: "#9E9E9E" },
  completedDateText: { color: "#4CAF50", fontWeight: "600" },
  overdueText: { color: "#D32F2F", fontWeight: "600" },
  todayText: { color: "#FF9800", fontWeight: "600" },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsContainer: { flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 },
  courseTag: {
    backgroundColor: "white",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  completedTag: { backgroundColor: "#EEEEEE", borderColor: "#BDBDBD" },
  courseTagText: { fontSize: 11, fontWeight: "600", color: "#444" },
  completedTagText: { color: "#757575" },
  typeTag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: "bold", textTransform: "capitalize" },
  difficultyTag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  checkButton: {
    backgroundColor: "#2ECC71",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reopenButton: {
    backgroundColor: "#E0E0E0",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BDBDBD",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#26A69A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: { color: "white", fontSize: 15, fontWeight: "600" },
});
