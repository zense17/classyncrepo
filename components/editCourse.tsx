import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditCourse() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialCourse = params.course ? JSON.parse(params.course as string) : {};
  const [course, setCourse] = useState(initialCourse);

  const handleAddSchedule = () => {
    const newSchedules = [...(course.schedules || []), { days: "TBA", time: "TBA", room: "TBA" }];
    setCourse({ ...course, schedules: newSchedules });
  };

  const handleRemoveSchedule = (index: number) => {
    if (course.schedules.length <= 1) {
      Alert.alert("Error", "Course must have at least one schedule");
      return;
    }
    const newSchedules = course.schedules.filter((_: any, i: number) => i !== index);
    setCourse({ ...course, schedules: newSchedules });
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#0F2F2A" />
            </TouchableOpacity>
            <Text style={styles.backText}>Back</Text>
          </View>
          
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Edit Course</Text>
          <Text style={styles.subHeader}>Update incorrect information</Text>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={course.title}
            onChangeText={(text) => setCourse({ ...course, title: text })}
            placeholder="Course Title"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Professor/Instructor</Text>
          <TextInput
            style={styles.input}
            value={course.faculty}
            onChangeText={(text) => setCourse({ ...course, faculty: text })}
            placeholder="Faculty Name"
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.label}>Code</Text>
              <TextInput
                style={styles.input}
                value={course.code}
                onChangeText={(text) => setCourse({ ...course, code: text })}
                placeholder="CS 101"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Units</Text>
              <TextInput
                style={styles.input}
                value={course.units?.toString()}
                keyboardType="numeric"
                onChangeText={(text) => setCourse({ ...course, units: parseInt(text) || 3 })}
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
                <Text style={styles.scheduleBlockTitle}>Day {index + 1}</Text>
                {course.schedules.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveSchedule(index)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.miniLabel}>Day(s)</Text>
              <TextInput
                style={styles.scheduleInput}
                value={schedule.days}
                placeholder="e.g., Mon, T, Th"
                placeholderTextColor="#9CA3AF"
                onChangeText={(text) => handleScheduleChange(index, "days", text)}
              />

              <Text style={styles.miniLabel}>Time</Text>
              <TextInput
                style={styles.scheduleInput}
                value={schedule.time}
                placeholder="e.g., 10:00 AM-12:00 PM"
                placeholderTextColor="#9CA3AF"
                onChangeText={(text) => handleScheduleChange(index, "time", text)}
              />

              <Text style={styles.miniLabel}>Room</Text>
              <TextInput
                style={styles.scheduleInput}
                value={schedule.room}
                placeholder="e.g., GYM 13"
                placeholderTextColor="#9CA3AF"
onChangeText={(text) => handleScheduleChange(index, "room", text)}
/>
</View>
))}
</ScrollView>
</KeyboardAvoidingView>
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
width: 40,
height: 40,
borderRadius: 20,
backgroundColor: "#fff",
alignItems: "center",
justifyContent: "center",
},
backText: { marginLeft: 10, fontSize: 16, color: "#546E7A" },
saveBtn: {
backgroundColor: "#20C997",
paddingHorizontal: 25,
paddingVertical: 10,
borderRadius: 15,
},
saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
content: { padding: 25 },
title: { fontSize: 28, fontWeight: "800", color: "#0F2F2A", marginBottom: 5 },
subHeader: { fontSize: 13, color: "#546E7A", marginBottom: 35 },
label: { fontSize: 16, fontWeight: "600", color: "#0F2F2A", marginBottom: 10 },
miniLabel: { fontSize: 14, fontWeight: "500", color: "#546E7A", marginBottom: 8 },
input: {
backgroundColor: "#fff",
borderRadius: 12,
borderWidth: 1.5,
borderColor: "#E5E7EB",
padding: 16,
fontSize: 14,
color: "#0F2F2A",
marginBottom: 20,
},
row: { flexDirection: "row" },
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
},
addScheduleText: { color: "#20C997", fontWeight: "600", fontSize: 14 },
scheduleBlock: {
backgroundColor: "#fff",
borderRadius: 16,
borderWidth: 1.5,
borderColor: "#E5E7EB",
padding: 16,
marginBottom: 16,
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
scheduleBlockTitle: {
fontSize: 16,
fontWeight: "700",
color: "#3B82F6",
},
scheduleInput: {
backgroundColor: "#F9FAFB",
borderRadius: 10,
borderWidth: 1.5,
borderColor: "#E5E7EB",
padding: 14,
fontSize: 14,
color: "#0F2F2A",
marginBottom: 14,
},
});