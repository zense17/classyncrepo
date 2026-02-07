import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

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

export default function EditCourse() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialCourse = params.course ? JSON.parse(params.course as string) : {};
  const [course, setCourse] = useState(initialCourse);
  
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

  const handleAddSchedule = () => {
    const newSchedules = [...(course.schedules || []), { days: "TBA", time: "TBA", room: "TBA" }];
    setCourse({ ...course, schedules: newSchedules });
  };

  const handleRemoveSchedule = (index: number) => {
    if (course.schedules.length <= 1) {
      showAlert(
        "error",
        "Cannot Remove",
        "Each course must have at least one schedule. You can edit the existing one instead.",
        [{ text: "Got it", style: "default" }]
      );
      return;
    }
    
    showAlert(
      "warning",
      "Remove Schedule?",
      `Are you sure you want to remove Day ${index + 1} schedule? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            const newSchedules = course.schedules.filter((_: any, i: number) => i !== index);
            setCourse({ ...course, schedules: newSchedules });
          }
        }
      ]
    );
  };

  const handleScheduleChange = (index: number, field: string, value: string) => {
    const newSchedules = [...course.schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setCourse({ ...course, schedules: newSchedules });
  };

  const handleSave = () => {
    // Build the time string from schedules for calendar compatibility
    const timeString = course.schedules
      .filter((s: any) => s.days !== "TBA" && s.time !== "TBA")
      .map((s: any) => `${s.days} ${s.time}`)
      .join(" / ");

    const updatedCourse = {
      ...course,
      time: timeString || "TBA"
    };

    router.navigate({
      pathname: "/(import)/verify",
      params: {
        updatedCourse: JSON.stringify(updatedCourse),
        updatedIndex: params.index as string,
        data: params.data,
      },
    });
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(course) !== params.course;
  };

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      showAlert(
        "warning",
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to go back?",
        [
          { text: "Keep Editing", style: "cancel" },
          { 
            text: "Discard", 
            style: "destructive",
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                     <Ionicons name="chevron-back" size={24} color={Colors.title} />
                   </TouchableOpacity>
            <Text style={styles.backText}>Back</Text>
          </View>

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Course</Text>
          <Text style={styles.subHeader}>Update incorrect information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={course.title}
              onChangeText={(text) => setCourse({ ...course, title: text })}
              placeholder="Course Title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Professor/Instructor</Text>
            <TextInput
              style={styles.input}
              value={course.faculty}
              onChangeText={(text) => setCourse({ ...course, faculty: text })}
              placeholder="Faculty Name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Code</Text>
              <TextInput
                style={styles.input}
                value={course.code}
                onChangeText={(text) => setCourse({ ...course, code: text })}
                placeholder="CS 101"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Units</Text>
              <TextInput
                style={styles.input}
                value={course.units?.toString()}
                keyboardType="numeric"
                onChangeText={(text) => setCourse({ ...course, units: parseInt(text) || 0 })}
                placeholder="3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.schedulesHeader}>
            <Text style={styles.label}>Schedules</Text>
            <TouchableOpacity style={styles.addScheduleBtn} onPress={handleAddSchedule}>
              <Ionicons name="add-circle" size={20} color="#20C997" />
              <Text style={styles.addScheduleText}>Add Day</Text>
            </TouchableOpacity>
          </View>

          {course.schedules?.map((schedule: any, index: number) => (
            <View key={index} style={styles.scheduleBlock}>
              <View style={styles.scheduleBlockHeader}>
                <View style={styles.scheduleBlockTitleContainer}>
                  <View style={styles.dayIndicator}>
                    <Text style={styles.dayIndicatorText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.scheduleBlockTitle}>Day {index + 1}</Text>
                </View>
                {course.schedules.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => handleRemoveSchedule(index)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.scheduleInputGroup}>
                <Text style={styles.miniLabel}>Day(s)</Text>
                <TextInput
                  style={styles.scheduleInput}
                  value={schedule.days}
                  placeholder="e.g., Mon, T, Th"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(text) => handleScheduleChange(index, "days", text)}
                />
              </View>

              <View style={styles.scheduleInputGroup}>
                <Text style={styles.miniLabel}>Time</Text>
                <TextInput
                  style={styles.scheduleInput}
                  value={schedule.time}
                  placeholder="e.g., 10:00 AM - 12:00 PM"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(text) => handleScheduleChange(index, "time", text)}
                />
              </View>

              <View style={[styles.scheduleInputGroup, { marginBottom: 0 }]}>
                <Text style={styles.miniLabel}>Room</Text>
                <TextInput
                  style={styles.scheduleInput}
                  value={schedule.room}
                  placeholder="e.g., GYM 13"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(text) => handleScheduleChange(index, "room", text)}
                />
              </View>
            </View>
          ))}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
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
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    padding: 4,
  },
  
  backText: { marginLeft: 10, fontSize: 16, color: "#546E7A", fontWeight: "500" },
  saveBtn: {
    backgroundColor: "#20C997",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#20C997",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  content: { padding: 25 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F2F2A", marginBottom: 5 },
  subHeader: { fontSize: 13, color: "#546E7A", marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", color: "#0F2F2A", marginBottom: 10 },
  miniLabel: { fontSize: 13, fontWeight: "500", color: "#546E7A", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 16,
    fontSize: 14,
    color: "#0F2F2A",
  },
  row: { flexDirection: "row", gap: 15 },
  halfInput: { flex: 1, marginBottom: 20 },
  schedulesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  addScheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addScheduleText: { color: "#059669", fontWeight: "600", fontSize: 13 },
  scheduleBlock: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  scheduleBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  scheduleBlockTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  dayIndicatorText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
  },
  scheduleBlockTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleInputGroup: {
    marginBottom: 14,
  },
  scheduleInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 14,
    fontSize: 14,
    color: "#0F2F2A",
  },
  
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