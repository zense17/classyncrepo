import { useAuth } from "@/lib/auth-context";
import { addCourses } from "@/lib/database";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SuccessModal from "@/components/SuccessModal";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const normalize = (value?: string, fallback = "TBA") => {
  if (!value) return fallback;
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
};

// Custom Alert Modal Component
interface CustomAlertProps {
  visible: boolean;
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress?: () => void;
  }>;
  onClose: () => void;
}

const CustomAlert = ({ visible, type, title, message, buttons, onClose }: CustomAlertProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case "warning":
        return { name: "warning", color: "#F59E0B", bgColor: "#FEF3C7" };
      case "error":
        return { name: "close-circle", color: "#EF4444", bgColor: "#FEE2E2" };
      case "info":
        return { name: "information-circle", color: "#3B82F6", bgColor: "#DBEAFE" };
      default:
        return { name: "information-circle", color: "#3B82F6", bgColor: "#DBEAFE" };
    }
  };

  const iconConfig = getIconConfig();

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "cancel":
        return { bg: "#F3F4F6", text: "#4B5563" };
      case "destructive":
        return { bg: "#FEE2E2", text: "#DC2626" };
      default:
        return { bg: "#20C997", text: "#FFFFFF" };
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.alertOverlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.alertContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.alertIconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name as any} size={32} color={iconConfig.color} />
          </View>
          
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          
          <View style={styles.alertButtonsContainer}>
            {buttons.map((button, index) => {
              const btnStyle = getButtonStyle(button.style);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    { backgroundColor: btnStyle.bg },
                    buttons.length === 1 && { flex: 1 },
                  ]}
                  onPress={() => {
                    onClose();
                    button.onPress?.();
                  }}
                >
                  <Text style={[styles.alertButtonText, { color: btnStyle.text }]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function VerifySchedule() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Custom alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: "warning" | "error" | "info";
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    buttons: [],
  });

  const showAlert = (
    type: "warning" | "error" | "info",
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }>
  ) => {
    setAlertConfig({ visible: true, type, title, message, buttons });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // Initialize courses from params.data
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

  // Handle returning from edit screen with updated course
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

      // Clear the params to prevent re-applying on subsequent renders
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
      showAlert("error", "Authentication Required", "You must be logged in to add courses.", [
        { text: "OK", style: "default" },
      ]);
      return;
    }

    if (editableCourses.length === 0) {
      showAlert("error", "No Courses", "There are no courses to add to your planner.", [
        { text: "OK", style: "default" },
      ]);
      return;
    }

    if (hasIssues) {
      showAlert(
        "warning",
        "Incomplete Information",
        "Some courses have missing details (marked as TBA). You can still add them and update later, or go back to edit.",
        [
          { text: "Go Back", style: "cancel" },
          { 
            text: "Add Anyway", 
            style: "default",
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
      
      showAlert(
        "error",
        "Save Failed",
        `Unable to add courses to your planner. ${error instanceof Error ? error.message : "Please try again."}`,
        [{ text: "OK", style: "default" }]
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

  // Generate current data string with updated courses for passing to edit screen
  const getCurrentDataString = () => {
    return JSON.stringify({ courses: editableCourses });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
             <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                 <Ionicons name="chevron-back" size={24} color={Colors.title} />
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
              <Text style={styles.warningTitle}>Review Recommended</Text>
              <Text style={styles.warningText}>Some fields need verification. Tap Edit to fix.</Text>
            </View>
          </View>
        )}

        {editableCourses.map((course: any, index: number) => {
          const code = normalize(course.code, "Unknown");
          const title = normalize(course.title, "Course Title");
          const hasMultipleSchedules = course.schedules && course.schedules.length > 1;
          const needsVerification = courseNeedsVerification(course);

          return (
            <View key={index} style={[styles.courseCard, needsVerification && styles.courseCardWarning]}>
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
                        pathname: "/(import)/editCourse",
                        params: {
                          course: JSON.stringify(course),
                          index: index.toString(),
                          // Pass the CURRENT state, not the original params.data
                          data: getCurrentDataString(),
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
                <Text style={[styles.metaText, normalize(course.faculty) === "TBA" && styles.tbaText]}>
                  {normalize(course.faculty)}
                </Text>
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
                        <Text style={[styles.metaText, normalize(schedule.time) === "TBA" && styles.tbaText]}>
                          {!hasMultipleSchedules && `${schedule.days} `}
                          {normalize(schedule.time)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#546E7A" />
                        <Text style={[styles.metaText, normalize(schedule.room) === "TBA" && styles.tbaText]}>
                          {normalize(schedule.room)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {needsVerification && (
                <View style={styles.courseWarning}>
                  <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                  <Text style={styles.courseWarningText}>Please verify this information</Text>
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
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmText}>Confirm and Add to Planner</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />

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
    padding: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F2F2A" },
  content: { padding: 20 },
  accuracyCard: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 20, 
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  progressBarFill: { height: "100%", borderRadius: 4 },
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
    borderWidth: 1,
    borderColor: "#A7F3D0",
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
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: "#B45309",
  },
  courseCard: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  courseCardWarning: {
    borderColor: "#FCD34D",
    borderWidth: 1.5,
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
  tbaText: { 
    color: "#F59E0B", 
    fontStyle: "italic",
    fontWeight: "500",
  },
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#20C997",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: { backgroundColor: "#B0E0D7" },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2F2A",
    marginBottom: 8,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: "#546E7A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  alertButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});