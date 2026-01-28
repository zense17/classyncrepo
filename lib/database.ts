import { ID, Query } from "react-native-appwrite";
import { databases } from "./appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COURSES_COLLECTION_ID = process.env.EXPO_PUBLIC_COURSES_COLLECTION_ID!;

export type Course = {
  $id?: string;
  userId: string;
  code: string;
  title: string;
  units: number;
  time: string;
  room: string;
  faculty: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
  createdAt?: string;
};

/**
 * ROBUST TIME PARSER
 * Handles: "Mon 1:00 PM - 4:00 PM", "MW 13:00-14:00", "Thu/Fri 10AM - 11AM"
 * Now also handles: "T 06:30 PM-07:30 PM / W 05:30 PM-08:30 PM"
 */
export function parseTimeString(timeStr: string) {
  const schedules: Array<{
    days: string[];
    startTime: string;
    endTime: string;
  }> = [];

  if (!timeStr || timeStr === "TBA") return schedules;

  // Split by " / " to get different day schedules
  const blocks = timeStr.split(" / ").map(s => s.trim());

  for (const block of blocks) {
    // Match pattern: "T 06:30 PM-07:30 PM" or "Mon 10:00 AM-12:00 PM"
    const match = block.match(/^([A-Za-z]+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))[-–\s]+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    
    if (match) {
      schedules.push({
        days: [match[1]], // Day as array
        startTime: match[2],
        endTime: match[3]
      });
    }
  }

  return schedules;
}

/**
 * Add courses to database
 */
export async function addCourses(
  userId: string,
  courses: any[] // Changed from strict type to accept the parsed courses
) {
  console.log("addCourses called with:", courses);

  // Use Promise.all to ensure all courses are saved in parallel
  const promises = courses.map(async (course) => {
    try {
      // Ensure time field exists (build from schedules if missing)
      let timeString = course.time;
      if (!timeString || timeString === "TBA") {
        // Rebuild time string from schedules array if available
        if (course.schedules && course.schedules.length > 0) {
          timeString = course.schedules
            .map((s: any) => `${s.days} ${s.time}`)
            .join(" / ");
        } else {
          timeString = "TBA";
        }
      }

      // Parse the time string to extract days and times
      const schedules = parseTimeString(timeString);

      // Flatten days array properly
      const allDays = schedules.flatMap((s) => s.days);
      const uniqueDays = [...new Set(allDays)]; // Remove duplicates

      console.log("Parsed schedules:", schedules);
      console.log("Unique days:", uniqueDays);

      const courseData = {
        userId,
        code: course.code || "Unknown",
        title: course.title || "Course Title",
        units: course.units || 3,
        time: timeString, // Keep original/rebuilt string for display
        room: course.room || "TBA",
        faculty: course.faculty || "TBA",
        days: uniqueDays, // Now properly flattened
        startTime: schedules[0]?.startTime || "", // Store the first found time
        endTime: schedules[0]?.endTime || "",
        createdAt: new Date().toISOString(),
      };

      console.log("Saving course to DB:", courseData);

      return await databases.createDocument(
        DATABASE_ID,
        COURSES_COLLECTION_ID,
        ID.unique(),
        courseData
      );
    } catch (error) {
      console.error("Error saving individual course:", course.code, error);
      throw error;
    }
  });

  return Promise.all(promises);
}

/**
 * Get all courses for a user
 */
export async function getCourses(userId: string): Promise<Course[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COURSES_COLLECTION_ID,
    [Query.equal("userId", userId), Query.orderDesc("createdAt")]
  );

  return response.documents as unknown as Course[];
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId: string) {
  return databases.deleteDocument(DATABASE_ID, COURSES_COLLECTION_ID, courseId);
}

/**
 * Delete all courses for a user
 */
export async function deleteAllCourses(userId: string) {
  const courses = await getCourses(userId);
  // Efficiently delete all
  const promises = courses.map((course) => deleteCourse(course.$id!));
  return Promise.all(promises);
}

/**
 * Update a single course
 */
export async function updateCourse(courseId: string, updates: Partial<Course>) {
  return databases.updateDocument(
    DATABASE_ID,
    COURSES_COLLECTION_ID,
    courseId,
    updates
  );
}