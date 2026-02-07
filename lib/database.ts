import { ID, Query } from "react-native-appwrite";
import { databases } from "./appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID!;
const COURSES_COLLECTION_ID = process.env.EXPO_PUBLIC_COURSES_COLLECTION_ID!;
const CURRICULUM_COLLECTION_ID = process.env.EXPO_PUBLIC_CURRICULUM_COLLECTION_ID!;

// ============================================
// TYPES
// ============================================

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

export type CurriculumSubject = {
  $id?: string;
  userId: string;
  yearLevel: string;
  semester: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  lecUnits?: number;
  labUnits?: number;
  grade?: string | number | null;
  status: string;
  instructor?: string;
};

// ============================================
// COR COURSE FUNCTIONS
// ============================================

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

  const blocks = timeStr.split(" / ").map(s => s.trim());

  for (const block of blocks) {
    const match = block.match(/^([A-Za-z]+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))[-–\s]+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    
    if (match) {
      schedules.push({
        days: [match[1]],
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
  courses: any[]
) {
  console.log("addCourses called with:", courses);

  const promises = courses.map(async (course) => {
    try {
      let timeString = course.time;
      if (!timeString || timeString === "TBA") {
        if (course.schedules && course.schedules.length > 0) {
          timeString = course.schedules
            .map((s: any) => `${s.days} ${s.time}`)
            .join(" / ");
        } else {
          timeString = "TBA";
        }
      }

      const schedules = parseTimeString(timeString);
      const allDays = schedules.flatMap((s) => s.days);
      const uniqueDays = [...new Set(allDays)];

      const courseData = {
        userId,
        code: course.code || "Unknown",
        title: course.title || "Course Title",
        units: course.units || 3,
        time: timeString,
        room: course.room || "TBA",
        faculty: course.faculty || "TBA",
        days: uniqueDays,
        startTime: schedules[0]?.startTime || "",
        endTime: schedules[0]?.endTime || "",
        createdAt: new Date().toISOString(),
      };

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

// ============================================
// CURRICULUM FUNCTIONS
// ============================================

/**
 * Add curriculum subjects (bulk import from OCR)
 */
export async function addCurriculumSubjects(
  userId: string,
  subjects: Omit<CurriculumSubject, 'userId' | '$id'>[]
) {
  const promises = subjects.map(async (subject) => {
    try {
      const subjectData = {
        userId,
        yearLevel: subject.yearLevel,
        semester: subject.semester,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        units: subject.units,
        lecUnits: subject.lecUnits || 0,
        labUnits: subject.labUnits || 0,
        grade: subject.grade || null,
        status: subject.status || 'upcoming',
        instructor: subject.instructor || null,
      };

      return await databases.createDocument(
        DATABASE_ID,
        CURRICULUM_COLLECTION_ID,
        ID.unique(),
        subjectData
      );
    } catch (error) {
      console.error('Error saving curriculum subject:', subject.subjectCode, error);
      throw error;
    }
  });

  return Promise.all(promises);
}

/**
 * Get all curriculum subjects for a user
 */
export async function getCurriculumByUser(userId: string): Promise<CurriculumSubject[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    CURRICULUM_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.limit(100), // ✅ FIX: Fetch up to 100 subjects instead of default 25
      Query.orderAsc('yearLevel'),
      Query.orderAsc('semester'),
    ]
  );

  console.log(`📚 Database returned ${response.documents.length} curriculum subjects`);
  return response.documents as unknown as CurriculumSubject[];
}

/**
 * Get curriculum grouped by year and semester
 */
export async function getCurriculumGrouped(userId: string) {
  const subjects = await getCurriculumByUser(userId);
  
  const grouped: Record<string, Record<string, CurriculumSubject[]>> = {};
  
  subjects.forEach((subject) => {
    if (!grouped[subject.yearLevel]) {
      grouped[subject.yearLevel] = {};
    }
    if (!grouped[subject.yearLevel][subject.semester]) {
      grouped[subject.yearLevel][subject.semester] = [];
    }
    grouped[subject.yearLevel][subject.semester].push(subject);
  });
  
  return grouped;
}

/**
 * Update subject grade (accepts both string and number)
 * Auto-marks subject as completed when grade is added
 */
export async function updateSubjectGrade(
  subjectId: string,
  grade: string | number,
  status?: 'completed' | 'ongoing' | 'upcoming'
) {
  const updateData: any = { grade: grade.toString() };
  
  // Auto-set status to completed if grade is provided and status not specified
  if (status) {
    updateData.status = status;
  } else if (grade) {
    updateData.status = 'completed';
  }
  
  return databases.updateDocument(
    DATABASE_ID,
    CURRICULUM_COLLECTION_ID,
    subjectId,
    updateData
  );
}

/**
 * Update subject status only
 */
export async function updateSubjectStatus(
  subjectId: string,
  status: 'upcoming' | 'ongoing' | 'completed'
): Promise<void> {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      CURRICULUM_COLLECTION_ID,
      subjectId,
      { status: status }
    );
  } catch (error) {
    console.error('Error updating subject status:', error);
    throw error;
  }
}

/**
 * Bulk update grades from uploaded file
 */
export async function bulkUpdateGrades(
  userId: string,
  grades: Array<{ subjectCode: string; grade: number | string }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get all user subjects
    const subjects = await getCurriculumByUser(userId);

    // Update each grade
    for (const gradeData of grades) {
      try {
        const subject = subjects.find(s => s.subjectCode === gradeData.subjectCode);
        
        if (!subject) {
          results.failed++;
          results.errors.push(`Subject ${gradeData.subjectCode} not found`);
          continue;
        }

        if (!subject.$id) {
          results.failed++;
          results.errors.push(`Subject ${gradeData.subjectCode} has no ID`);
          continue;
        }

        await updateSubjectGrade(subject.$id, gradeData.grade);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to update ${gradeData.subjectCode}: ${error}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error bulk updating grades:', error);
    throw error;
  }
}

/**
 * Calculate completion percentage
 */
export async function getCompletionPercentage(userId: string): Promise<number> {
  const subjects = await getCurriculumByUser(userId);
  
  if (subjects.length === 0) return 0;
  
  const completedCount = subjects.filter(s => s.status === 'completed').length;
  return Math.round((completedCount / subjects.length) * 100);
}

/**
 * Delete all curriculum for a user
 */
export async function deleteAllCurriculum(userId: string) {
  const subjects = await getCurriculumByUser(userId);
  const promises = subjects.map((subject) =>
    databases.deleteDocument(DATABASE_ID, CURRICULUM_COLLECTION_ID, subject.$id!)
  );
  return Promise.all(promises);
}