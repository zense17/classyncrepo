import { useAuth } from "@/lib/auth-context";
import { addCourses } from "@/lib/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomAlert from "../../components/Alerts";
import { Colors } from "../../constants/colors";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generate time options (30 min intervals)
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let h = 6; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h >= 12 ? "PM" : "AM";
      const minute = m.toString().padStart(2, "0");
      times.push(`${hour}:${minute} ${period}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export default function AddClass() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "",
    faculty: "",
    room: "",
    code: "",
    units: "3",
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("8:00 AM");
  const [endTime, setEndTime] = useState("10:00 AM");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!form.title.trim()) {
      setErrorMessage("Please enter a subject name");
      setShowError(true);
      return;
    }
    if (!form.code.trim()) {
      setErrorMessage("Please enter a course code");
      setShowError(true);
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMessage("Please select at least one day");
      setShowError(true);
      return;
    }
    if (!user) {
      setErrorMessage("You must be logged in");
      setShowError(true);
      return;
    }

    setIsLoading(true);

    try {
      // Build time string in format: "Mon 8:00 AM-10:00 AM / Wed 8:00 AM-10:00 AM"
      const timeString = selectedDays
        .map((day) => `${day} ${startTime}-${endTime}`)
        .join(" / ");

      const courseData = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        faculty: form.faculty.trim() || "TBA",
        room: form.room.trim() || "TBA",
        units: parseInt(form.units) || 3,
        time: timeString,
      };

      await addCourses(user.$id, [courseData]);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to add class:", error);
      setErrorMessage("Failed to add class. Please try again.");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const renderTimeItem = (
    time: string,
    onSelect: (time: string) => void,
    selectedTime: string,
  ) => (
    <TouchableOpacity
      style={[
        styles.timeOption,
        time === selectedTime && styles.timeOptionActive,
      ]}
      onPress={() => onSelect(time)}
    >
      <Text
        style={[
          styles.timeOptionText,
          time === selectedTime && styles.timeOptionTextActive,
        ]}
      >
        {time}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Class</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Add Subject Name"
            placeholderTextColor={Colors.mutedText}
            value={form.title}
            onChangeText={(t) => setForm({ ...form, title: t })}
          />
        </View>

        {/* Professor/Instructor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Professor/Instructor</Text>
          <TextInput
            style={styles.input}
            placeholder="Add Description"
            placeholderTextColor={Colors.mutedText}
            value={form.faculty}
            onChangeText={(t) => setForm({ ...form, faculty: t })}
          />
        </View>

        {/* Room and Code Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room Name"
              placeholderTextColor={Colors.mutedText}
              value={form.room}
              onChangeText={(t) => setForm({ ...form, room: t })}
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject Code"
              placeholderTextColor={Colors.mutedText}
              value={form.code}
              onChangeText={(t) => setForm({ ...form, code: t })}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Schedule</Text>
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => setShowDayPicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={Colors.secondary}
            />
            <Text style={styles.scheduleBtnText}>
              {selectedDays.length > 0
                ? `Every ${selectedDays.join(", ")}`
                : "Select Days"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={Colors.secondary}
              />
              <Text style={styles.timeBtnText}>{startTime}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 16 }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={Colors.secondary}
              />
              <Text style={styles.timeBtnText}>{endTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Units */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Units</Text>
          <TextInput
            style={[styles.input, { width: 100 }]}
            placeholder="3"
            placeholderTextColor={Colors.mutedText}
            value={form.units}
            onChangeText={(t) => setForm({ ...form, units: t })}
            keyboardType="numeric"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveBtnText}>
              {isLoading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Day Picker Modal */}
      <Modal
        visible={showDayPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDayPicker(false)}
        >
          <View
            style={styles.pickerContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.pickerTitle}>Select Days</Text>
            <View style={styles.daysGrid}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    selectedDays.includes(day) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selectedDays.includes(day) && styles.dayChipTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setShowDayPicker(false)}
            >
              <Text style={styles.pickerDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowStartPicker(false)}
        >
          <View
            style={styles.timePickerContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.pickerTitle}>Select Start Time</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderTimeItem(
                  item,
                  (time) => {
                    setStartTime(time);
                    setShowStartPicker(false);
                  },
                  startTime,
                )
              }
              showsVerticalScrollIndicator={false}
              style={styles.timeList}
            />
            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.pickerCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowEndPicker(false)}
        >
          <View
            style={styles.timePickerContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.pickerTitle}>Select End Time</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderTimeItem(
                  item,
                  (time) => {
                    setEndTime(time);
                    setShowEndPicker(false);
                  },
                  endTime,
                )
              }
              showsVerticalScrollIndicator={false}
              style={styles.timeList}
            />
            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.pickerCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccess}
        type="success"
        title="Class Added!"
        message="Your new class has been added to your schedule."
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
      />

      {/* Error Alert */}
      <CustomAlert
        visible={showError}
        type="error"
        title="Error"
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.title,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.title,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.navBackground,
  },
  row: {
    flexDirection: "row",
  },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.navBackground,
    alignSelf: "flex-start",
  },
  scheduleBtnText: {
    fontSize: 15,
    color: Colors.text,
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.navBackground,
  },
  timeBtnText: {
    fontSize: 15,
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.secondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  timePickerContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    maxHeight: "70%",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.title,
    textAlign: "center",
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.uiBackground,
    borderWidth: 1,
    borderColor: Colors.navBackground,
  },
  dayChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  dayChipTextActive: {
    color: "#FFFFFF",
  },
  pickerDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerDoneBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pickerCancelBtn: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  pickerCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.secondary,
  },

  // Time List Styles
  timeList: {
    maxHeight: 300,
  },
  timeOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.uiBackground,
  },
  timeOptionActive: {
    backgroundColor: Colors.secondary,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    textAlign: "center",
  },
  timeOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
