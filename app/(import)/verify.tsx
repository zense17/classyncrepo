import { useAuth } from "@/lib/auth-context";
import { addCourses } from "@/lib/database";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SuccessModal from "@/components/SuccessModal"; // Adjust path as needed

const normalize = (value?: string, fallback = "TBA") => {
  if (!value) return fallback;
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
};

export default function VerifySchedule() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [editableCourses, setEditableCourses] = useState(() => {
    if (!params.data) return [];
    try {
      const parsed = typeof params.data === 'string' ? JSON.parse(params.data) : { courses: [] };
      return parsed.courses || [];
    } catch (e) {
      console.error("Failed to parse courses", e);
      return [];
    }
  });

  useEffect(() => {
    if (params.updatedCourse && params.updatedIndex !== undefined) {
      const updated = JSON.parse(params.updatedCourse as string);
      const idx = parseInt(params.updatedIndex as string);

      setEditableCourses((prev: any[]) => {
        const newList = [...prev];
        if (idx >= 0 && idx < newList.length) {
          newList[idx] = updated;
        }
        return newList;
      });

      router.setParams({ updatedCourse: undefined, updatedIndex: undefined });
    }
  }, [params.updatedCourse, params.updatedIndex]);

  const calculateAccuracy = () => {
    if (!editableCourses || editableCourses.length === 0) return 0;
    let totalFields = 0;
    let extractedFields = 0;

    editableCourses.forEach((course: any) => {
      const checks = [
        normalize(course.code, "Unknown") !== "Unknown",
        normalize(course.title, "Course Title") !== "Course Title",
        course.schedules && course.schedules.length > 0,
        normalize(course.faculty) !== "TBA",
      ];
      totalFields += checks.length;
      extractedFields += checks.filter(Boolean).length;

      if (course.schedules) {
        course.schedules.forEach((sched: any) => {
          const schedChecks = [
            normalize(sched.days) !== "TBA",
            normalize(sched.time) !== "TBA",
            normalize(sched.room) !== "TBA",
          ];
          totalFields += schedChecks.length;
          extractedFields += schedChecks.filter(Boolean).length;
        });
      }
    });
    return Math.round((extractedFields / totalFields) * 100);
  };

  const getVerificationStatus = () => {
    let hasIssues = false;
    let issueCount = 0;

    editableCourses.forEach((course: any) => {
      if (normalize(course.code, "Unknown") === "Unknown" ||
          normalize(course.title, "Course Title") === "Course Title" ||
          normalize(course.faculty) === "TBA") {
        hasIssues = true;
        issueCount++;
      }

      if (course.schedules) {
        course.schedules.forEach((sched: any) => {
          if (normalize(sched.days) === "TBA" || 
              normalize(sched.time) === "TBA" || 
              normalize(sched.room) === "TBA") {
            hasIssues = true;
          }
        });
      }
    });

    return { hasIssues, issueCount };
  };

  const getTotalUnits = () => {
    return editableCourses.reduce((sum: number, course: any) => sum + (course.units || 0), 0);
  };

  const accuracy = calculateAccuracy();
  const { hasIssues } = getVerificationStatus();

  const getAccuracyColor = (percent: number) => {
    if (percent >= 80) return "#10B981";
    if (percent >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const getAccuracyStatus = (percent: number) => {
    if (percent >= 80) return "Excellent";
    if (percent >= 60) return "Good";
    return "Needs Review";
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add courses");
      return;
    }

    if (editableCourses.length === 0) {
      Alert.alert("Error", "No courses to add");
      return;
    }

    if (hasIssues) {
      Alert.alert(
        "Incomplete Data",
        "Some courses have missing information (TBA fields). Do you want to continue anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Continue", 
            onPress: async () => {
              await addCoursesToDatabase();
            }
          }
        ]
      );
    } else {
      await addCoursesToDatabase();
    }
  };

  const addCoursesToDatabase = async () => {
  setIsLoading(true);
  try {
    console.log("=== STARTING DATABASE SAVE ===");
    console.log("User ID:", user!.$id);
    console.log("Courses to save:", JSON.stringify(editableCourses, null, 2));
    
    await addCourses(user!.$id, editableCourses);
    
    console.log("=== SAVE SUCCESSFUL ===");
    setIsLoading(false);
    setShowSuccessModal(true);
  } catch (error) {
    setIsLoading(false);
    console.error("=== SAVE FAILED ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    
    Alert.alert(
      "Error", 
      `Failed to add courses. ${error instanceof Error ? error.message : "Unknown error"}\n\nCheck console for details.`
    );
  }
};

  const handleModalClose = () => {
    setShowSuccessModal(false);
    router.replace("/(tabs)/calendar");
  };

  const courseNeedsVerification = (course: any) => {
    if (normalize(course.code, "Unknown") === "Unknown" ||
        normalize(course.title, "Course Title") === "Course Title" ||
        normalize(course.faculty) === "TBA") {
      return true;
    }

    if (course.schedules) {
      for (const sched of course.schedules) {
        if (normalize(sched.days) === "TBA" || 
            normalize(sched.time) === "TBA" || 
            normalize(sched.room) === "TBA") {
          return true;
        }
      }
    }

    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F2F2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Schedule</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.accuracyCard}>
          <View style={styles.accuracyHeader}>
            <Text style={styles.accuracyTitle}>Extraction Accuracy</Text>
            <Text style={[styles.accuracyPercent, { color: getAccuracyColor(accuracy) }]}>
              {accuracy}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${accuracy}%`, backgroundColor: getAccuracyColor(accuracy) }]} />
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.statusItemText}>{editableCourses.length} courses</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="stats-chart" size={16} color={getAccuracyColor(accuracy)} />
              <Text style={styles.statusItemText}>{getAccuracyStatus(accuracy)}</Text>
            </View>
          </View>
        </View>

        {accuracy === 100 && !hasIssues && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Extraction Complete</Text>
              <Text style={styles.successText}>All courses found. No need to review.</Text>
            </View>
          </View>
        )}

        {hasIssues && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningText}>Some data may need verification.</Text>
            </View>
          </View>
        )}

        {editableCourses.map((course: any, index: number) => {
          const code = normalize(course.code, "Unknown");
          const title = normalize(course.title, "Course Title");
          const hasMultipleSchedules = course.schedules && course.schedules.length > 1;
          const needsVerification = courseNeedsVerification(course);

          return (
            <View key={index} style={styles.courseCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.courseCode}>{code}</Text>
                  <Text style={styles.units}>{course.units ?? "-"} units</Text>
                </View>

                <View style={styles.badgeContainer}>
                  {hasMultipleSchedules && (
                    <View style={styles.multipleBadge}>
                      <Ionicons name="calendar" size={10} color="#fff" />
                      <Text style={styles.badgeText}>{course.schedules.length} days</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.editBadge}
                    onPress={() =>
                      router.push({
                        pathname: "../../components/editCourse",
                        params: { 
                          course: JSON.stringify(course), 
                          index: index.toString(),
                          data: params.data as string 
                        },
                      })
                    }
                  >
                    <Ionicons name="pencil" size={10} color="#fff" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.courseTitle}>{title}</Text>

              <View style={styles.facultyRow}>
                <Ionicons name="person-outline" size={14} color="#546E7A" />
                <Text style={styles.metaText}>{normalize(course.faculty)}</Text>
              </View>

              <View style={styles.schedulesContainer}>
                {course.schedules && course.schedules.map((schedule: any, schedIdx: number) => (
                  <View
                    key={schedIdx}
                    style={[
                      styles.scheduleRow,
                      hasMultipleSchedules && schedIdx > 0 && styles.scheduleRowBordered
                    ]}
                  >
                    {hasMultipleSchedules && (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{schedule.days}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#546E7A" />
                        <Text style={styles.metaText}>
                          {!hasMultipleSchedules && `${schedule.days} `}
                          {normalize(schedule.time)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#546E7A" />
                        <Text style={styles.metaText}>{normalize(schedule.room)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {needsVerification && (
                <View style={styles.courseWarning}>
                  <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                  <Text style={styles.courseWarningText}>Please verify this information.</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]} 
            onPress={handleConfirm} 
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Confirm and Add to Planner</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleModalClose}
        coursesCount={editableCourses.length}
        totalUnits={getTotalUnits()}
      />
    </SafeAreaView>
  );
}

// ... keep all existing styles ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 10 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#fff", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F2F2A" },
  content: { padding: 20 },
  accuracyCard: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 20, 
    elevation: 4 
  },
  accuracyHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 12 
  },
  accuracyTitle: { fontSize: 16, fontWeight: "700" },
  accuracyPercent: { fontSize: 28, fontWeight: "800" },
  progressBarContainer: { 
    height: 8, 
    backgroundColor: "#E5E7EB", 
    borderRadius: 4, 
    overflow: "hidden", 
    marginBottom: 12 
  },
  progressBarFill: { height: "100%" },
  statusGrid: { flexDirection: "row", gap: 12 },
  statusItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    flex: 1, 
    backgroundColor: "#F9FAFB", 
    padding: 8, 
    borderRadius: 8 
  },
  statusItemText: { fontSize: 12, fontWeight: "600" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 2,
  },
  successText: {
    fontSize: 12,
    color: "#047857",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
  },
  courseCard: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    elevation: 2 
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  courseCode: { fontSize: 18, fontWeight: "800", color: "#20C997" },
  units: { fontSize: 12, color: "#546E7A" },
  badgeContainer: { flexDirection: "row", gap: 6, alignItems: "center" },
  multipleBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#3B82F6", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    gap: 4 
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  editBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#20C997", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    gap: 4 
  },
  editText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  courseTitle: { 
    fontSize: 15, 
    fontWeight: "700", 
    marginVertical: 8, 
    color: "#0F2F2A" 
  },
  facultyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  schedulesContainer: { gap: 0 },
  scheduleRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
  },
  scheduleRowBordered: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
    marginTop: 8,
    paddingTop: 12,
  },
  dayBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 35,
    alignItems: "center",
    height: 24,
    justifyContent: "center"
  },
  dayBadgeText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "700"
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: "#546E7A" },
  courseWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  courseWarningText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  footer: { marginTop: 20, paddingBottom: 40 },
  confirmBtn: { 
    backgroundColor: "#20C997", 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: "center" 
  },
  confirmBtnDisabled: { backgroundColor: "#B0E0D7" },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});