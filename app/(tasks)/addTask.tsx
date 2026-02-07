// app/(tasks)/addTask.tsx
// Add Task Form - Collects input for decision tree priority calculation
// Shows priority analysis result after task creation

import { useAuth } from "@/lib/auth-context";
import { Course, getCourses } from "@/lib/database";
import {
  calculatePriority,
  Difficulty,
  formatEstimatedTime,
  getPriorityStyles,
  isMajorSubject,
  PriorityResult,
  TaskType,
} from "@/lib/taskPriority";
import { createTask, CreateTaskInput } from "@/lib/taskService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// ============================================================
// CONFIGURATION
// ============================================================

const TASK_TYPES: { value: TaskType; label: string; icon: string }[] = [
  { value: "assignment", label: "Assignment", icon: "document-text-outline" },
  { value: "exam", label: "Exam", icon: "school-outline" },
  { value: "project", label: "Project", icon: "rocket-outline" },
  { value: "quiz", label: "Quiz", icon: "help-circle-outline" },
  { value: "presentation", label: "Presentation", icon: "easel-outline" },
  { value: "lab", label: "Lab", icon: "flask-outline" },
  { value: "study", label: "Study", icon: "book-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  color: string;
}[] = [
  { value: "easy", label: "Easy", color: "#4CAF50" },
  { value: "medium", label: "Medium", color: "#FF9800" },
  { value: "hard", label: "Hard", color: "#F44336" },
];

const TIME_PRESETS = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "2 hrs", value: 120 },
  { label: "3 hrs", value: 180 },
  { label: "4+ hrs", value: 240 },
  { label: "Custom", value: -1 },
];

const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// ============================================================
// PRIORITY RESULT MODAL
// ============================================================

interface PriorityResultModalProps {
  visible: boolean;
  priorityResult: PriorityResult | null;
  taskTitle: string;
  courseCode: string;
  onAddAnother: () => void;
  onViewTasks: () => void;
}

function PriorityResultModal({
  visible,
  priorityResult,
  taskTitle,
  courseCode,
  onAddAnother,
  onViewTasks,
}: PriorityResultModalProps) {
  if (!priorityResult) return null;

  const prStyles = getPriorityStyles(priorityResult.finalPriority);

  const getPriorityIcon = () => {
    switch (priorityResult.finalPriority) {
      case "Critical":
        return "alert-circle";
      case "High":
        return "arrow-up-circle";
      case "Medium":
        return "remove-circle";
      case "Low":
        return "arrow-down-circle";
      default:
        return "help-circle";
    }
  };

  const getPriorityEmoji = () => {
    switch (priorityResult.finalPriority) {
      case "Critical":
        return "🔴";
      case "High":
        return "🟠";
      case "Medium":
        return "🟡";
      case "Low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onViewTasks}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Success Header */}
          <View style={modalStyles.successHeader}>
            <View style={modalStyles.checkCircle}>
              <Ionicons name="checkmark" size={32} color="white" />
            </View>
            <Text style={modalStyles.successTitle}>Task Created!</Text>
          </View>

          <ScrollView
            style={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Priority Result Card */}
            <View
              style={[
                modalStyles.priorityCard,
                { backgroundColor: prStyles.cardBg },
              ]}
            >
              <View style={modalStyles.priorityHeader}>
                <Text style={modalStyles.priorityLabel}>
                  Decision Tree Analysis
                </Text>
                <Ionicons name="git-branch-outline" size={20} color="#666" />
              </View>

              {/* Priority Level */}
              <View style={modalStyles.priorityLevelContainer}>
                <View
                  style={[
                    modalStyles.priorityBadge,
                    { backgroundColor: prStyles.accent },
                  ]}
                >
                  <Ionicons name={getPriorityIcon()} size={28} color="white" />
                </View>
                <View style={modalStyles.priorityTextContainer}>
                  <Text style={modalStyles.priorityEmoji}>
                    {getPriorityEmoji()}
                  </Text>
                  <Text
                    style={[
                      modalStyles.priorityLevel,
                      { color: prStyles.tagText },
                    ]}
                  >
                    {priorityResult.finalPriority.toUpperCase()}
                  </Text>
                  <Text style={modalStyles.prioritySubtext}>PRIORITY</Text>
                </View>
              </View>

              {/* Task Info */}
              <View style={modalStyles.taskInfo}>
                <Text style={modalStyles.taskTitle} numberOfLines={2}>
                  {taskTitle}
                </Text>
                <View style={modalStyles.taskMeta}>
                  <View style={modalStyles.courseTag}>
                    <Text style={modalStyles.courseTagText}>{courseCode}</Text>
                  </View>
                  {priorityResult.isMajorSubject && (
                    <View style={modalStyles.majorTag}>
                      <Text style={modalStyles.majorTagText}>
                        ⭐ Major Subject
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Analysis Breakdown */}
              <View style={modalStyles.analysisSection}>
                <Text style={modalStyles.analysisSectionTitle}>
                  Analysis Breakdown
                </Text>

                <View style={modalStyles.analysisRow}>
                  <View style={modalStyles.analysisIcon}>
                    <Ionicons name="time-outline" size={18} color="#26A69A" />
                  </View>
                  <View style={modalStyles.analysisContent}>
                    <Text style={modalStyles.analysisLabel}>Time Urgency</Text>
                    <Text style={modalStyles.analysisValue}>
                      {priorityResult.urgencyLevel.charAt(0).toUpperCase() +
                        priorityResult.urgencyLevel.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={modalStyles.analysisRow}>
                  <View style={modalStyles.analysisIcon}>
                    <Ionicons name="layers-outline" size={18} color="#26A69A" />
                  </View>
                  <View style={modalStyles.analysisContent}>
                    <Text style={modalStyles.analysisLabel}>Base Priority</Text>
                    <Text style={modalStyles.analysisValue}>
                      {priorityResult.basePriority}
                    </Text>
                  </View>
                </View>

                {priorityResult.isMajorSubject && (
                  <View style={modalStyles.analysisRow}>
                    <View
                      style={[
                        modalStyles.analysisIcon,
                        { backgroundColor: "#FFF8E1" },
                      ]}
                    >
                      <Ionicons
                        name="trending-up-outline"
                        size={18}
                        color="#FF9800"
                      />
                    </View>
                    <View style={modalStyles.analysisContent}>
                      <Text style={modalStyles.analysisLabel}>
                        Major Subject Boost
                      </Text>
                      <Text
                        style={[
                          modalStyles.analysisValue,
                          { color: "#FF9800" },
                        ]}
                      >
                        +1 Level Applied
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Recommendation */}
              <View style={modalStyles.recommendationBox}>
                <Ionicons name="bulb-outline" size={20} color="#F57F17" />
                <Text style={modalStyles.recommendationText}>
                  {priorityResult.recommendation}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity
              style={modalStyles.addAnotherButton}
              onPress={onAddAnother}
            >
              <Ionicons name="add" size={20} color="#26A69A" />
              <Text style={modalStyles.addAnotherText}>Add Another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.doneButton}
              onPress={onViewTasks}
            >
              <Text style={modalStyles.doneText}>View Tasks</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// DATE PICKER MODAL
// ============================================================

interface SimpleDatePickerProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

function SimpleDatePicker({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: SimpleDatePickerProps) {
  const dateOptions = generateDateOptions();

  const formatDateOption = (date: Date, index: number): string => {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={formStyles.dateModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={formStyles.dateModalContent}
          onStartShouldSetResponder={() => true}
        >
          <View style={formStyles.dateModalHeader}>
            <Text style={formStyles.dateModalTitle}>Select Due Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={formStyles.dateList}
            showsVerticalScrollIndicator={false}
          >
            {dateOptions.map((date, index) => {
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    formStyles.dateOption,
                    isSelected && formStyles.dateOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(date);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      formStyles.dateOptionText,
                      isSelected && formStyles.dateOptionTextSelected,
                    ]}
                  >
                    {formatDateOption(date, index)}
                  </Text>
                  <Text
                    style={[
                      formStyles.dateOptionSubtext,
                      isSelected && formStyles.dateOptionTextSelected,
                    ]}
                  >
                    {date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#26A69A"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================================
// TIME PICKER MODAL
// ============================================================

interface SimpleTimePickerProps {
  visible: boolean;
  selectedHour: number; // 1-12
  selectedMinute: number; // 0-59
  selectedPeriod: "AM" | "PM";
  onConfirm: (hour: number, minute: number, period: "AM" | "PM") => void;
  onClose: () => void;
}

function SimpleTimePicker({
  visible,
  selectedHour,
  selectedMinute,
  selectedPeriod,
  onConfirm,
  onClose,
}: SimpleTimePickerProps) {
  const [hour, setHour] = useState(selectedHour);
  const [minute, setMinute] = useState(selectedMinute);
  const [period, setPeriod] = useState<"AM" | "PM">(selectedPeriod);

  // Sync when modal opens
  useEffect(() => {
    if (visible) {
      setHour(selectedHour);
      setMinute(selectedMinute);
      setPeriod(selectedPeriod);
    }
  }, [visible, selectedHour, selectedMinute, selectedPeriod]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={timePickerStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={timePickerStyles.container}
          onStartShouldSetResponder={() => true}
        >
          <View style={timePickerStyles.header}>
            <Text style={timePickerStyles.title}>Select Time</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <View style={timePickerStyles.displayRow}>
            <Text style={timePickerStyles.displayTime}>
              {hour}:{minute.toString().padStart(2, "0")} {period}
            </Text>
          </View>

          {/* Picker Columns */}
          <View style={timePickerStyles.columnsRow}>
            {/* Hour Column */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>Hour</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {hours.map((h) => (
                  <TouchableOpacity
                    key={`h-${h}`}
                    style={[
                      timePickerStyles.optionItem,
                      hour === h && timePickerStyles.optionItemActive,
                    ]}
                    onPress={() => setHour(h)}
                  >
                    <Text
                      style={[
                        timePickerStyles.optionText,
                        hour === h && timePickerStyles.optionTextActive,
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minute Column */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>Minute</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {minutes.map((m) => (
                  <TouchableOpacity
                    key={`m-${m}`}
                    style={[
                      timePickerStyles.optionItem,
                      minute === m && timePickerStyles.optionItemActive,
                    ]}
                    onPress={() => setMinute(m)}
                  >
                    <Text
                      style={[
                        timePickerStyles.optionText,
                        minute === m && timePickerStyles.optionTextActive,
                      ]}
                    >
                      {m.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Column */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>Period</Text>
              <View style={timePickerStyles.periodColumn}>
                {(["AM", "PM"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      timePickerStyles.periodItem,
                      period === p && timePickerStyles.periodItemActive,
                    ]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text
                      style={[
                        timePickerStyles.periodText,
                        period === p && timePickerStyles.periodTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Quick Presets */}
          <View style={timePickerStyles.presetsSection}>
            <Text style={timePickerStyles.presetsLabel}>Quick Presets</Text>
            <View style={timePickerStyles.presetsRow}>
              {[
                { label: "8:00 AM", h: 8, m: 0, p: "AM" as const },
                { label: "12:00 PM", h: 12, m: 0, p: "PM" as const },
                { label: "5:00 PM", h: 5, m: 0, p: "PM" as const },
                { label: "11:59 PM", h: 11, m: 55, p: "PM" as const },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={timePickerStyles.presetChip}
                  onPress={() => {
                    setHour(preset.h);
                    setMinute(preset.m);
                    setPeriod(preset.p);
                  }}
                >
                  <Text style={timePickerStyles.presetChipText}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={timePickerStyles.confirmButton}
            onPress={() => onConfirm(hour, minute, period)}
          >
            <Text style={timePickerStyles.confirmText}>Set Time</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AddTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("assignment");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  // Time picker state
  const [dueHour, setDueHour] = useState(11);
  const [dueMinute, setDueMinute] = useState(55);
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("PM");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // UI State
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Result Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [createdTaskResult, setCreatedTaskResult] =
    useState<PriorityResult | null>(null);
  const [createdTaskTitle, setCreatedTaskTitle] = useState("");
  const [createdTaskCourse, setCreatedTaskCourse] = useState("");

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) {
      setIsLoadingCourses(false);
      return;
    }
    try {
      const fetchedCourses = await getCourses(user.$id);
      setCourses(fetchedCourses);
      if (fetchedCourses.length > 0) setSelectedCourse(fetchedCourses[0]);
    } catch (error) {
      console.error("Failed to load courses:", error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Build the full due date+time for preview
  const getFullDueDate = (): Date => {
    const combined = new Date(dueDate);
    let hours24 = dueHour;
    if (duePeriod === "PM" && dueHour !== 12) hours24 += 12;
    if (duePeriod === "AM" && dueHour === 12) hours24 = 0;
    combined.setHours(hours24, dueMinute, 0, 0);
    return combined;
  };

  const previewPriority = selectedCourse
    ? calculatePriority({
        dueDate: getFullDueDate(),
        difficulty,
        estimatedMinutes,
        taskType,
        courseCode: selectedCourse.code,
      })
    : null;

  const handleTimePreset = (value: number) => {
    if (value === -1) {
      setShowCustomTime(true);
    } else {
      setEstimatedMinutes(value);
      setShowCustomTime(false);
    }
  };

  const handleCustomTimeChange = (text: string) => {
    setCustomTime(text);
    const mins = parseInt(text);
    if (!isNaN(mins) && mins > 0) setEstimatedMinutes(mins);
  };

  const handleTimeConfirm = (
    hour: number,
    minute: number,
    period: "AM" | "PM",
  ) => {
    setDueHour(hour);
    setDueMinute(minute);
    setDuePeriod(period);
    setShowTimePicker(false);
  };

  const isFormValid = () => title.trim() !== "" && selectedCourse !== null;

  const formatDueDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return "Today";
    if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDueTime = (): string => {
    return `${dueHour}:${dueMinute.toString().padStart(2, "0")} ${duePeriod}`;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(new Date());
    setTaskType("assignment");
    setDifficulty("medium");
    setEstimatedMinutes(60);
    setCustomTime("");
    setShowCustomTime(false);
    setDueHour(11);
    setDueMinute(55);
    setDuePeriod("PM");
  };

  const handleAddAnother = () => {
    setShowResultModal(false);
    resetForm();
  };
  const handleViewTasks = () => {
    setShowResultModal(false);
    router.replace("/(tabs)/tasks");
  };

  const handleSubmit = async () => {
    if (!user || !selectedCourse) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    setIsLoading(true);
    try {
      // Combine date + time into a single Date
      const fullDueDate = getFullDueDate();

      const taskInput: CreateTaskInput = {
        title: title.trim(),
        description: description.trim(),
        courseCode: selectedCourse.code,
        courseName: selectedCourse.title,
        dueDate: fullDueDate,
        estimatedMinutes,
        difficulty,
        taskType,
      };

      await createTask(user.$id, taskInput);
      setCreatedTaskResult(previewPriority);
      setCreatedTaskTitle(title.trim());
      setCreatedTaskCourse(selectedCourse.code);
      setShowResultModal(true);
    } catch (error) {
      console.error("Failed to create task:", error);
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={formStyles.container}>
      {/* Header */}
      <View style={formStyles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/tasks")}
          style={formStyles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={formStyles.headerTitle}>Add New Task</Text>
          <Text style={formStyles.headerSubtitle}>
            AI will calculate priority
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={formStyles.scrollView}
          contentContainerStyle={formStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Task Title */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Task Title *</Text>
            <TextInput
              style={formStyles.textInput}
              placeholder="e.g., Programming Assignment 3"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Course Selector */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Course *</Text>
            {isLoadingCourses ? (
              <ActivityIndicator size="small" color="#26A69A" />
            ) : courses.length === 0 ? (
              <View style={formStyles.noCourses}>
                <Ionicons name="warning-outline" size={24} color="#FF9800" />
                <Text style={formStyles.noCoursesText}>
                  No courses found. Import your COR first.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={formStyles.courseSelector}
                onPress={() => setShowCourseSelector(!showCourseSelector)}
              >
                <View style={formStyles.courseSelectorContent}>
                  {selectedCourse ? (
                    <>
                      <Text style={formStyles.courseCode}>
                        {selectedCourse.code}
                      </Text>
                      <Text style={formStyles.courseTitle} numberOfLines={1}>
                        {selectedCourse.title}
                      </Text>
                      {isMajorSubject(selectedCourse.code) && (
                        <View style={formStyles.majorTag}>
                          <Text style={formStyles.majorTagText}>Major</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={formStyles.placeholderText}>
                      Select a course
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={showCourseSelector ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            )}

            {showCourseSelector && (
              <View style={formStyles.courseDropdown}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {courses.map((course) => (
                    <TouchableOpacity
                      key={course.$id}
                      style={[
                        formStyles.courseOption,
                        selectedCourse?.$id === course.$id &&
                          formStyles.courseOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedCourse(course);
                        setShowCourseSelector(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={formStyles.courseOptionCode}>
                          {course.code}
                        </Text>
                        <Text
                          style={formStyles.courseOptionTitle}
                          numberOfLines={1}
                        >
                          {course.title}
                        </Text>
                      </View>
                      {isMajorSubject(course.code) && (
                        <View style={formStyles.majorTag}>
                          <Text style={formStyles.majorTagText}>Major</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Due Date & Time */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Deadline *</Text>
            <View style={formStyles.dateTimeRow}>
              {/* Date Button */}
              <TouchableOpacity
                style={formStyles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#26A69A" />
                <Text style={formStyles.dateButtonText}>
                  {formatDueDate(dueDate)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </TouchableOpacity>

              {/* Time Button */}
              <TouchableOpacity
                style={formStyles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#26A69A" />
                <Text style={formStyles.timeButtonText}>{formatDueTime()}</Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Task Type */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Task Type</Text>
            <View style={formStyles.taskTypeGrid}>
              {TASK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    formStyles.taskTypeButton,
                    taskType === type.value && formStyles.taskTypeButtonActive,
                  ]}
                  onPress={() => setTaskType(type.value)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={taskType === type.value ? "white" : "#666"}
                  />
                  <Text
                    style={[
                      formStyles.taskTypeText,
                      taskType === type.value && formStyles.taskTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Difficulty</Text>
            <View style={formStyles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    formStyles.difficultyButton,
                    difficulty === option.value && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => setDifficulty(option.value)}
                >
                  <Text
                    style={[
                      formStyles.difficultyText,
                      difficulty === option.value &&
                        formStyles.difficultyTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estimated Time */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>
              Estimated Time: {formatEstimatedTime(estimatedMinutes)}
            </Text>
            <View style={formStyles.timePresetRow}>
              {TIME_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    formStyles.timePresetButton,
                    (preset.value === estimatedMinutes ||
                      (preset.value === -1 && showCustomTime)) &&
                      formStyles.timePresetButtonActive,
                  ]}
                  onPress={() => handleTimePreset(preset.value)}
                >
                  <Text
                    style={[
                      formStyles.timePresetText,
                      (preset.value === estimatedMinutes ||
                        (preset.value === -1 && showCustomTime)) &&
                        formStyles.timePresetTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {showCustomTime && (
              <View style={formStyles.customTimeContainer}>
                <TextInput
                  style={formStyles.customTimeInput}
                  placeholder="Minutes"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={customTime}
                  onChangeText={handleCustomTimeChange}
                />
                <Text style={formStyles.customTimeLabel}>minutes</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={formStyles.section}>
            <Text style={formStyles.sectionLabel}>Description (Optional)</Text>
            <TextInput
              style={[formStyles.textInput, formStyles.textArea]}
              placeholder="Add any notes or details..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[
              formStyles.analyzeButton,
              !isFormValid() && formStyles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="git-branch-outline" size={22} color="white" />
                <Text style={formStyles.analyzeButtonText}>
                  Analyze with Decision Tree
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SimpleDatePicker
        visible={showDatePicker}
        selectedDate={dueDate}
        onSelect={setDueDate}
        onClose={() => setShowDatePicker(false)}
      />
      <SimpleTimePicker
        visible={showTimePicker}
        selectedHour={dueHour}
        selectedMinute={dueMinute}
        selectedPeriod={duePeriod}
        onConfirm={handleTimeConfirm}
        onClose={() => setShowTimePicker(false)}
      />
      <PriorityResultModal
        visible={showResultModal}
        priorityResult={createdTaskResult}
        taskTitle={createdTaskTitle}
        courseCode={createdTaskCourse}
        onAddAnother={handleAddAnother}
        onViewTasks={handleViewTasks}
      />
    </SafeAreaView>
  );
}

// ============================================================
// TIME PICKER STYLES
// ============================================================

const timePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  displayRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  displayTime: {
    fontSize: 36,
    fontWeight: "800",
    color: "#26A69A",
    letterSpacing: 1,
  },
  columnsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollColumn: {
    maxHeight: 180,
    width: "100%",
  },
  optionItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 2,
  },
  optionItemActive: {
    backgroundColor: "#E0F7FA",
  },
  optionText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
  },
  optionTextActive: {
    color: "#26A69A",
    fontWeight: "700",
  },
  periodColumn: {
    gap: 8,
    width: "100%",
  },
  periodItem: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  periodItemActive: {
    backgroundColor: "#26A69A",
  },
  periodText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  periodTextActive: {
    color: "white",
  },
  presetsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  confirmButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#26A69A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});

// ============================================================
// MODAL STYLES
// ============================================================

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "white",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    overflow: "hidden",
  },
  successHeader: {
    backgroundColor: "#26A69A",
    padding: 24,
    alignItems: "center",
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: "white" },
  scrollContent: { padding: 16 },
  priorityCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  priorityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    letterSpacing: 0.5,
  },
  priorityLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  priorityBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityTextContainer: { flex: 1 },
  priorityEmoji: { fontSize: 24, marginBottom: 4 },
  priorityLevel: { fontSize: 24, fontWeight: "800", letterSpacing: 1 },
  prioritySubtext: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  taskInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  taskMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  courseTag: {
    backgroundColor: "white",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  courseTagText: { fontSize: 12, fontWeight: "600", color: "#444" },
  majorTag: {
    backgroundColor: "#FFF9C4",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  majorTagText: { fontSize: 12, fontWeight: "600", color: "#F57F17" },
  analysisSection: { marginBottom: 16 },
  analysisSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  analysisIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E0F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analysisLabel: { fontSize: 13, color: "#666" },
  analysisValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  recommendationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF8E1",
    padding: 12,
    borderRadius: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: "#5D4037",
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  addAnotherButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#26A69A",
  },
  addAnotherText: { fontSize: 14, fontWeight: "600", color: "#26A69A" },
  doneButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#26A69A",
  },
  doneText: { fontSize: 14, fontWeight: "600", color: "white" },
});

// ============================================================
// FORM STYLES
// ============================================================

const formStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    backgroundColor: "#4DB6AC",
    borderRadius: 50,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#000" },
  headerSubtitle: { fontSize: 13, color: "#666", marginTop: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: { minHeight: 80, paddingTop: 14 },
  noCourses: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8E1",
    padding: 14,
    borderRadius: 12,
  },
  noCoursesText: { flex: 1, color: "#F57C00", fontSize: 13 },
  courseSelector: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  courseSelectorContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  courseCode: { fontSize: 14, fontWeight: "700", color: "#26A69A" },
  courseTitle: { flex: 1, fontSize: 14, color: "#333" },
  placeholderText: { color: "#999", fontSize: 15 },
  majorTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  majorTagText: { fontSize: 10, fontWeight: "700", color: "#2E7D32" },
  courseDropdown: {
    backgroundColor: "white",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  courseOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  courseOptionSelected: { backgroundColor: "#E0F7FA" },
  courseOptionCode: { fontSize: 14, fontWeight: "700", color: "#333" },
  courseOptionTitle: { fontSize: 12, color: "#666", marginTop: 2 },

  // Date & Time row
  dateTimeRow: { flexDirection: "row", gap: 10 },
  dateButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateButtonText: { flex: 1, fontSize: 14, color: "#333", fontWeight: "500" },
  timeButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 130,
  },
  timeButtonText: { fontSize: 14, color: "#333", fontWeight: "500" },

  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dateModalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  dateList: { paddingHorizontal: 16, paddingBottom: 40 },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dateOptionSelected: {
    backgroundColor: "#E0F7FA",
    borderRadius: 12,
    marginVertical: 2,
  },
  dateOptionText: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1 },
  dateOptionSubtext: { fontSize: 13, color: "#666", marginRight: 10 },
  dateOptionTextSelected: { color: "#26A69A" },
  taskTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  taskTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  taskTypeButtonActive: { backgroundColor: "#26A69A", borderColor: "#26A69A" },
  taskTypeText: { fontSize: 13, color: "#666", fontWeight: "500" },
  taskTypeTextActive: { color: "white" },
  difficultyRow: { flexDirection: "row", gap: 10 },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  difficultyText: { fontSize: 14, fontWeight: "600", color: "#666" },
  difficultyTextActive: { color: "white" },
  timePresetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timePresetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  timePresetButtonActive: {
    backgroundColor: "#26A69A",
    borderColor: "#26A69A",
  },
  timePresetText: { fontSize: 13, color: "#666", fontWeight: "500" },
  timePresetTextActive: { color: "white" },
  customTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  customTimeInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    width: 100,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    textAlign: "center",
  },
  customTimeLabel: { fontSize: 14, color: "#666" },
  analyzeButton: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
    backgroundColor: "#26A69A",
    shadowColor: "#00897B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  analyzeButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  submitButtonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
    elevation: 0,
  },
});
