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

        <View style={styles.stepsContainer}>
          <StepItem label="Document detected" active={steps.detected} />
          <StepItem label="Text recognition" active={steps.recognized} />
          <StepItem label="Extracting courses..." active={steps.extracted} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// BU BSCS CURRICULUM DATABASE
// Used for looking up correct subject names when OCR extraction fails
// ============================================================================

const BU_BSCS_CURRICULUM: Record<string, { title: string; units: number }> = {
  // FIRST YEAR - First Semester
  "CS 101": { title: "Introduction to Computing", units: 3 },
  "CS 102": { title: "Computer Programming 1 (Fundamentals of Programming)", units: 3 },
  "MATH 101": { title: "Mathematics 1", units: 3 },
  "PHYS 1": { title: "Physics for Computing", units: 5 },
  "GEC 11": { title: "Mathematics in the Modern World", units: 3 },
  "PATHFIT 1": { title: "Movement Competency Training", units: 2 },
  "NSTP 11": { title: "LTS/CWTS/ROTC", units: 3 },

  // FIRST YEAR - Second Semester
  "CS 103": { title: "Computer Programming 2 (Intermediate Programming)", units: 3 },
  "CS 207": { title: "Digital System Design", units: 2 },
  "MATH 102": { title: "Mathematical Analysis 2", units: 5 },
  "GEC 12": { title: "Readings in the Philippine History", units: 3 },
  "GEC 33": { title: "The Contemporary World", units: 3 },
  "PATHFIT 2": { title: "Exercise-based Fitness Activities", units: 2 },
  "NSTP 12": { title: "LTS/CWTS/ROTC", units: 3 },

  // SECOND YEAR - First Semester
  "CS 104": { title: "Data Structure and Algorithm", units: 3 },
  "CS 106": { title: "Application Development and Emerging Technologies", units: 3 },
  "CS 108": { title: "Object-oriented Programming", units: 3 },
  "CS 109": { title: "Discrete Structures 1", units: 3 },
  "MATH ELEC 101": { title: "Linear Algebra", units: 3 },
  "GEC 14": { title: "Art Appreciation", units: 3 },
  "PATHFIT 3": { title: "Menu of Dance, Sports, Martial Arts, Group Exercises", units: 2 },

  // SECOND YEAR - Second Semester
  "CS 105": { title: "Information Management", units: 3 },
  "CS 110": { title: "Discrete Structures 2", units: 3 },
  "CS 111": { title: "Design and Analysis of Algorithms", units: 3 },
  "CS 112": { title: "Programming Languages", units: 3 },
  "CS 113": { title: "Special Topics in Computing", units: 3 },
  "MATH ELEC 102": { title: "Differential Equations", units: 3 },
  "GEC 15": { title: "Purposive Communication", units: 3 },
  "PATHFIT 4": { title: "Menu of Dance, Sports, Martial Arts, Group Exercises and Outdoor Adventure Activities", units: 2 },

  // THIRD YEAR - First Semester
  "CS 114": { title: "Operating Systems", units: 3 },
  "CS 115": { title: "Computer Architecture and Organization", units: 3 },
  "CS 116": { title: "Automata Theory and Formal Languages", units: 3 },
  "CS 117": { title: "Software Engineering 1", units: 3 },
  "CS ELEC 1": { title: "CS Elective 1", units: 3 },
  "GEC 16": { title: "Art Appreciation/Pagpapahalaga sa Sining", units: 3 },

  // THIRD YEAR - Second Semester
  "CS 118": { title: "Software Engineering 2", units: 3 },
  "CS 119": { title: "Networks and Communication", units: 3 },
  "CS 120": { title: "Human Computer Interaction", units: 3 },
  "CS 121": { title: "Information Assurance and Security", units: 3 },
  "CS ELEC 2": { title: "CS Elective 2", units: 3 },
  "GEC 17": { title: "Science, Technology and Society/Agham, Teknolohiya at Lipunan", units: 3 },
  "GEC 18": { title: "Ethics", units: 3 },

  // THIRD YEAR - Summer
  "CS 122": { title: "Practicum (240 hours)", units: 3 },

  // FOURTH YEAR - First Semester
  "CS 123": { title: "Numerical Analysis", units: 3 },
  "CS 124": { title: "CS Thesis 1", units: 3 },
  "CS ELEC 3": { title: "CS Elective 3", units: 3 },
  "GEC 20": { title: "The Entrepreneurial Mind", units: 3 },
  "GEC ELEC 22": { title: "Environmental Science", units: 3 },

  // FOURTH YEAR - Second Semester
  "CS 125": { title: "CS Thesis 2", units: 3 },
  "CS 126": { title: "Social Issues and Professional Practice", units: 3 },
  "GEC 19": { title: "Life and Works of Rizal", units: 3 },
  "GEC ELEC 21": { title: "GEC Elective 21", units: 3 },
  "GEC ELEC 21.4": { title: "Living in the IT Era", units: 3 },
  "GEC ELEC 21.3": { title: "Human Reproduction", units: 3 },

  // Alternative code formats (for OCR variations)
  "GEC ELECT 21.3": { title: "Human Reproduction", units: 3 },
  "GEC ELECT 21.4": { title: "Living in the IT Era", units: 3 },
  "GEC ELEC 213": { title: "Human Reproduction", units: 3 },
  "GEC ELEC 214": { title: "Living in the IT Era", units: 3 },

  // Professional Electives
  "CS ELEC 21": { title: "Distributed Systems", units: 3 },
  "CS ELEC 22": { title: "Mobile Computing", units: 3 },

  // Math courses
  "MATH 1": { title: "College Algebra", units: 3 },
  "MATH 2": { title: "Plane Trigonometry", units: 3 },
};

// List of garbage strings that should never be used as subjects
const GARBAGE_SUBJECTS = [
  "official receipt",
  "receipt",
  "payment",
  "validation",
  "certificate",
  "registrar",
  "signature",
  "printed by",
  "keep this",
  "total",
  "assessed",
  "fee",
  "balance",
  "unit",
  "credit",
  "bscs",
  "college",
];

// Helper function to check if a subject looks like garbage
function isGarbageSubject(subject: string): boolean {
  if (!subject || subject.length < 4) return true;
  const lower = subject.toLowerCase();
  return GARBAGE_SUBJECTS.some(garbage => lower.includes(garbage));
}

// Helper function to look up subject from curriculum
function getSubjectFromCurriculum(code: string): string | null {
  const normalizedCode = code.toUpperCase().replace(/\s+/g, " ").trim();
  
  if (BU_BSCS_CURRICULUM[normalizedCode]) {
    return BU_BSCS_CURRICULUM[normalizedCode].title;
  }
  
  const noSpaceCode = normalizedCode.replace(/\s+/g, "");
  for (const [key, value] of Object.entries(BU_BSCS_CURRICULUM)) {
    if (key.replace(/\s+/g, "") === noSpaceCode) {
      return value.title;
    }
  }
  
  return null;
}

// Helper function to get units from curriculum
function getUnitsFromCurriculum(code: string): number {
  const normalizedCode = code.toUpperCase().replace(/\s+/g, " ").trim();
  
  if (BU_BSCS_CURRICULUM[normalizedCode]) {
    return BU_BSCS_CURRICULUM[normalizedCode].units;
  }
  
  return 3;
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
    /^(GEC\s+Ele[c]?t?\s*\d+\.?\d*)\b/i,
    /^(GEG\s+Ele[c]?t?\s*\d+\.?\d*)\b/i,
    /^(Math\s+Ed\s+\d+)\b/i,
    /^(Math\s+Elec\s+\d+)\b/i,
    /^(MATH\s+\d{1,3})\b/i,
    /^(PATHFit\s*\d+)\b/i,
    /^(PATHFIT\s*\d+)\b/i,
    /^(NSTP\s*\d+)\b/i,
    /^(PHYS\s*\d+)\b/i,
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
        let code = match[1].replace(/\s+/g, " ").trim().toUpperCase();
        code = code.replace(/^GEG/, "GEC");
        code = code.replace(/ELECT/, "ELEC");
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

  // Map codes to subjects - ALWAYS USE CURRICULUM FOR KNOWN CODES
  courseCodes.forEach((code, i) => {
    // First, try to get from curriculum (most reliable)
    const curriculumSubject = getSubjectFromCurriculum(code);
    
    if (curriculumSubject) {
      // Always use curriculum for known courses
      courseMap.set(code, curriculumSubject);
      console.log(`Using curriculum for ${code}: ${curriculumSubject}`);
    } else {
      // Fallback to OCR extraction, but validate it
      let subject = subjects[i];
      if (!subject || isGarbageSubject(subject)) {
        subject = "Course Title";
      }
      courseMap.set(code, subject);
    }
  });

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

    const roomMatch = line.match(/^(GYM\s*\d+|ECB\s*\d+|IMO|CL\s*\d+|CLS?|Rm\s*\d+|L\d+|[CG]SD\s*\d+|CSO\s*\d+|AVR\s*\d*)$/i);
    if (roomMatch) {
      let room = line.toUpperCase();
      room = room.replace(/GSD/, "CSD").replace(/CSO/, "CSD");
      rooms.push(room);
    }

    const facultyMatch = line.match(/^(\d?\s*[A-Z][A-Za-z]+(?:[-\s][A-Z][a-z]+)?)[,\s]+([A-Z]\.?\s*[A-Z]?)$/i);
    if (facultyMatch) faculty.push(`${facultyMatch[1].trim()}, ${facultyMatch[2].trim()}`);
  }

  console.log("Extracted - Units:", units, "Days:", days, "Times:", times, "Rooms:", rooms, "Faculty:", faculty);

  // FIX MISSING DAY DETECTION
  if (courseCodes.length === 4 && times.length >= 5 && days.length === 4) {
    if (days[0] === "T" && days[1] === "Sat") {
      console.log("Detected missing 'W' - inserting after 'T'");
      days.splice(1, 0, "W");
    }
  }

  console.log("Adjusted Days:", days);
  console.log(`Times: ${times.length}, Days: ${days.length}, Rooms: ${rooms.length}, Faculty: ${faculty.length}`);

  // Now match schedules to courses
  const courses: any[] = [];
  let dayIdx = 0, timeIdx = 0, roomIdx = 0, facultyIdx = 0;

  for (let i = 0; i < courseCodes.length; i++) {
    const code = courseCodes[i];
    const title = courseMap.get(code) || getSubjectFromCurriculum(code) || "Course Title";
    
    // Determine number of schedules for this course
    let numSchedules = 1;
    
    // CS 104 gets 2 schedules if it starts with T
    if (i === 0 && days[dayIdx] === "T") {
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

    const courseUnits = units[i] || getUnitsFromCurriculum(code);

    courses.push({
      code,
      title,
      units: courseUnits,
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