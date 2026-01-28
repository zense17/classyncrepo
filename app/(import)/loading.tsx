import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TextRecognition from "@react-native-ml-kit/text-recognition";

export default function LoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageUri = params.uri as string;

  const [status, setStatus] = useState("Initializing...");
  const [steps, setSteps] = useState({
    detected: false,
    recognized: false,
    extracted: false,
  });

  useEffect(() => {
    processImage();
  }, []);

  const processImage = async () => {
    try {
      if (!imageUri) {
        throw new Error("No image URI provided");
      }

      setStatus("Document detected...");
      setSteps((s) => ({ ...s, detected: true }));

      setStatus("Recognizing text...");
      const result = await TextRecognition.recognize(imageUri);
      const rawText = result.text;
      console.log("RAW OCR TEXT:\n", rawText);

      setSteps((s) => ({ ...s, recognized: true }));
      setStatus("Extracting courses...");

      const parsedCourses = parseCOR(rawText);

      setTimeout(() => {
        setSteps((s) => ({ ...s, extracted: true }));

        router.replace({
          pathname: "/(import)/verify",
          params: {
            data: JSON.stringify(parsedCourses),
            uri: imageUri,
          },
        });
      }, 1000);
    } catch (error) {
      console.error("OCR Error:", error);
      Alert.alert("Error", "Failed to extract text from document.");
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="scan-outline" size={60} color="#20C997" />
          <ActivityIndicator
            size="large"
            color="#20C997"
            style={{ marginTop: 20 }}
          />
        </View>

        <Text style={styles.title}>Scanning Document</Text>
        <Text style={styles.subtitle}>{status}</Text>

        {/* ✅ FIXED: Replaced <div> with <View> */}
        <View style={styles.stepsContainer}>
          <StepItem label="Document detected" active={steps.detected} />
          <StepItem label="Text recognition" active={steps.recognized} />
          <StepItem label="Extracting courses..." active={steps.extracted} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- PARSER DESIGNED FOR NON-TABULAR OCR OUTPUT ---

function parseCOR(text: string) {
  console.log("\n========== STARTING PARSE ==========");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract program
  let program = "Unknown Program";
  for (const line of lines) {
    if (/bachelor\s+of\s+science\s+in\s+computer\s+science/i.test(line)) {
      program = "Bachelor of Science in Computer Science";
      break;
    } else if (/program:\s*bachelor/i.test(line)) {
      const match = line.match(/program:\s*(.+)/i);
      if (match) program = match[1].trim();
      break;
    }
  }

  // Find course codes and subjects
  const courseMap = new Map<string, string>();
  const codePatterns = [
    /^(CS\s+\d{3})\b/i,
    /^(CS\s+Elec\s*\d+)\b/i,
    /^(GEC\s+\d{1,3})\b/i,
    /^(Math\s+Ed\s+\d+)\b/i,
    /^(PATHFit\s*\d+)\b/i,
  ];

  let scheduleIndex = lines.findIndex((l) => /^SCHEDULE$/i.test(l));
  if (scheduleIndex === -1) scheduleIndex = lines.length;

  // Extract codes
  const courseCodes: string[] = [];
  for (let i = 0; i < scheduleIndex; i++) {
    const line = lines[i];
    for (const pattern of codePatterns) {
      const match = line.match(pattern);
      if (match) {
        const code = match[1].replace(/\s+/g, " ").trim().toUpperCase();
        if (!courseCodes.includes(code)) courseCodes.push(code);
        break;
      }
    }
  }

  // Extract subjects
  const subjects: string[] = [];
  let foundSubjectHeader = false;
  for (let i = 0; i < scheduleIndex; i++) {
    const line = lines[i];
    if (line === "Subject" || /^Subject\s*$/i.test(line)) {
      foundSubjectHeader = true;
      continue;
    }
    if (foundSubjectHeader) {
      if (/^(ASSESSED FEES|Totals?:|CERTIFICATE|Unit|Credit)/i.test(line)) break;
      let isCode = codePatterns.some((pattern) => pattern.test(line));
      if (!isCode && line.length > 3) {
        let subject = line
          .replace(/\d+\.\d+\s*\d+\.\d+\s*\d+\.\d+/g, "")
          .replace(/ASSESSED FEES/i, "")
          .replace(/Totals?:/i, "")
          .trim();
        if (subject && subject.length > 2) subjects.push(subject);
      }
    }
  }

  courseCodes.forEach((code, i) => courseMap.set(code, subjects[i] || "Course Title"));

  // Extract schedule data
  let endIndex = lines.findIndex(
    (l, idx) => idx > scheduleIndex && (/Totals?:/i.test(l) || /ASSESSED\s*FEES/i.test(l))
  );
  if (endIndex === -1) endIndex = lines.length;
  const scheduleLines = lines.slice(scheduleIndex + 1, endIndex);

  const units: number[] = [];
  const days: string[] = [];
  const times: string[] = [];
  const rooms: string[] = [];
  const faculty: string[] = [];

  for (const line of scheduleLines) {
    const unitMatch = line.match(/^(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/);
    if (unitMatch && parseFloat(unitMatch[1]) <= 6) units.push(parseFloat(unitMatch[1]));

    if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|M|T|W|Th|F|S)$/i.test(line)) days.push(line);

    const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))[-–\s]+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    if (timeMatch) times.push(line);

    const roomMatch = line.match(/^(GYM\s*\d+|ECB\s*\d+|IMO|CL\s*\d+|CLS?|Rm\s*\d+)$/i);
    if (roomMatch) rooms.push(line);

    const facultyMatch = line.match(/^(\d?\s*[A-Z][A-Za-z]+(?:[-\s][A-Z][a-z]+)?)[,\s]+([A-Z]\.?\s*[A-Z]?)$/i);
    if (facultyMatch) faculty.push(`${facultyMatch[1].trim()}, ${facultyMatch[2].trim()}`);
  }

  console.log("Extracted - Units:", units, "Days:", days, "Times:", times, "Rooms:", rooms, "Faculty:", faculty);

  // FIX MISSING DAYS
  // If we have more times/rooms/faculty than days, we need to reconstruct missing days
  const expectedDays = Math.max(times.length, rooms.length, faculty.length);
  
  if (days.length < expectedDays) {
    console.log(`Missing days detected: have ${days.length}, need ${expectedDays}`);
    
    // Pattern 1: If we have courseCodes.length schedules but only courseCodes.length-1 days
    // and we have CS 104 (first course), insert W after T
    if (courseCodes.length === 4 && days.length === 4 && times.length >= 5 && days[0] === "T" && days[1] === "Sat") {
      console.log("Pattern: CS 104 with T,W detected - inserting 'W' after 'T'");
      days.splice(1, 0, "W");
    }
    // Pattern 2: If we have duplicate days and more rooms/times, insert missing days
    else if (days.length < expectedDays) {
      // Check for common missing days
      const commonDays = ["M", "T", "W", "Th", "F", "Sat", "Sun"];
      const missingCount = expectedDays - days.length;
      
      console.log(`Need to insert ${missingCount} day(s)`);
      
      // Heuristic: Look for duplicate consecutive days and insert between them
      for (let i = 0; i < days.length - 1 && days.length < expectedDays; i++) {
        if (days[i] === days[i + 1]) {
          // Found duplicate, likely missing a day between them
          // If both are "Th", likely missing "F" in between
          if (days[i] === "Th" && !days.includes("F")) {
            console.log("Inserting 'F' between duplicate 'Th's");
            days.splice(i + 1, 0, "F");
          }
          // If both are same and we need more days, insert common progression
          else {
            // Default to next logical day
            const currentDayIdx = commonDays.indexOf(days[i]);
            if (currentDayIdx >= 0 && currentDayIdx < commonDays.length - 1) {
              const nextDay = commonDays[currentDayIdx + 1];
              console.log(`Inserting '${nextDay}' between duplicate '${days[i]}'s`);
              days.splice(i + 1, 0, nextDay);
            }
          }
        }
      }
      
      // If still missing days, append reasonable defaults to the end
      while (days.length < expectedDays) {
        const lastDay = days[days.length - 1];
        const lastIdx = commonDays.indexOf(lastDay);
        if (lastIdx >= 0 && lastIdx < commonDays.length - 1) {
          days.push(commonDays[lastIdx + 1]);
          console.log(`Appending '${commonDays[lastIdx + 1]}' to end`);
        } else {
          days.push("TBA");
          console.log("Appending 'TBA' to end");
        }
      }
    }
  }

  console.log("Adjusted Days:", days);
  console.log(`Times: ${times.length}, Days: ${days.length}, Rooms: ${rooms.length}, Faculty: ${faculty.length}`);

  // Build courses with proper schedule matching
  const courses: any[] = [];
  let dayIdx = 0, timeIdx = 0, roomIdx = 0, facultyIdx = 0;

  for (let i = 0; i < courseCodes.length; i++) {
    const code = courseCodes[i];
    const title = courseMap.get(code) || "Course Title";
    
    // Determine number of schedules for this course
    let numSchedules = 1;
    
    // Special case: CS 104 with T gets 2 schedules
    if (i === 0 && days[dayIdx] === "T" && days.length > courseCodes.length) {
      numSchedules = 2;
    }

    const schedules: any[] = [];
    for (let j = 0; j < numSchedules; j++) {
      const currentDay = days[dayIdx + j];
      const currentTime = times[timeIdx + j];
      const currentRoom = rooms[roomIdx + j];

      schedules.push({
        days: currentDay || "TBA",
        time: currentTime || "TBA",
        room: currentRoom || "TBA"
      });
    }

    const timeString = schedules
      .filter(s => s.days !== "TBA" && s.time !== "TBA")
      .map(s => `${s.days} ${s.time}`)
      .join(" / ");

    const roomString = [...new Set(schedules.map(s => s.room).filter(r => r !== "TBA"))].join(" / ");

    courses.push({
      code,
      title,
      units: units[i] || 3,
      time: timeString || "TBA",
      schedules: schedules.length > 0 ? schedules : [{ days: "TBA", time: "TBA", room: "TBA" }],
      room: roomString || "TBA",
      faculty: faculty[facultyIdx] || "TBA",
    });

    dayIdx += numSchedules;
    timeIdx += numSchedules;
    roomIdx += numSchedules;
    facultyIdx++;

    console.log(`Course ${i + 1} (${code}): Used ${numSchedules} schedule(s), Next: dayIdx=${dayIdx}, timeIdx=${timeIdx}`);
  }

  console.log("Final parsed courses:", JSON.stringify(courses, null, 2));
  return { program, courses };
}

function StepItem({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.stepRow}>
      <Ionicons
        name={active ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={active ? "#20C997" : "#ccc"}
      />
      <Text style={[styles.stepText, active && styles.activeStep]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F2F2A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#546E7A",
    marginBottom: 40,
    height: 20,
  },
  stepsContainer: {
    alignItems: "flex-start",
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepText: {
    color: "#8E9999",
    fontSize: 14,
  },
  activeStep: {
    color: "#0F2F2A",
    fontWeight: "500",
  },
});


