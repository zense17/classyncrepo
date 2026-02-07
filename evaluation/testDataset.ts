// evaluation/testDataset.ts
import { Priority, Difficulty, TaskType, TaskInput } from '../lib/taskPriority';

// Helper to create dates relative to "now" for testing
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export interface TestTask extends TaskInput {
  id: number;
  title: string;
  expectedPriority: Priority;
}

export const testDataset: TestTask[] = [
  // ==========================================
  // ORIGINAL 50 TASKS (IDs 1-50)
  // ==========================================

  // --- CRITICAL (Urgent + High Value/Hard) ---
  { id: 1, title: "Thesis Defense", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 120, taskType: "presentation", courseCode: "THESIS 2", expectedPriority: "Critical" },
  { id: 2, title: "Data Structs Final", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 300, taskType: "exam", courseCode: "CS 102", expectedPriority: "Critical" },
  { id: 3, title: "Calc Problem Set", dueDate: addDays(0), difficulty: "medium", estimatedMinutes: 60, taskType: "assignment", courseCode: "Math 50", expectedPriority: "Critical" }, 
  { id: 4, title: "Physics Lab Report", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 180, taskType: "lab", courseCode: "Phys 1", expectedPriority: "Critical" },
  { id: 5, title: "Capstone Prototype", dueDate: addDays(0), difficulty: "hard", estimatedMinutes: 400, taskType: "project", courseCode: "CS 105", expectedPriority: "Critical" },
  { id: 6, title: "Algo Analysis", dueDate: addDays(1), difficulty: "medium", estimatedMinutes: 90, taskType: "study", courseCode: "CS 201", expectedPriority: "Critical" },
  { id: 7, title: "Late Assignment", dueDate: addDays(-1), difficulty: "easy", estimatedMinutes: 30, taskType: "assignment", courseCode: "CS 101", expectedPriority: "Critical" }, // Overdue
  { id: 8, title: "Math Quiz", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 45, taskType: "quiz", courseCode: "Math 101", expectedPriority: "Critical" },
  { id: 9, title: "Overdue Project", dueDate: addDays(-2), difficulty: "hard", estimatedMinutes: 600, taskType: "project", courseCode: "GEC 1", expectedPriority: "Critical" },
  { id: 10, title: "Thesis Abstract", dueDate: addDays(1), difficulty: "medium", estimatedMinutes: 60, taskType: "other", courseCode: "THESIS 1", expectedPriority: "Critical" },

  // --- HIGH (Urgent Minor OR Moderate Major) ---
  { id: 11, title: "PE Reflection", dueDate: addDays(1), difficulty: "easy", estimatedMinutes: 30, taskType: "assignment", courseCode: "PE 1", expectedPriority: "High" },
  { id: 12, title: "History Reading", dueDate: addDays(1), difficulty: "medium", estimatedMinutes: 45, taskType: "study", courseCode: "GEC 2", expectedPriority: "High" },
  { id: 13, title: "NSTP Docs", dueDate: addDays(0), difficulty: "medium", estimatedMinutes: 60, taskType: "project", courseCode: "NSTP 2", expectedPriority: "High" },
  { id: 14, title: "CS Midterm Prep", dueDate: addDays(4), difficulty: "hard", estimatedMinutes: 240, taskType: "exam", courseCode: "CS 102", expectedPriority: "High" }, 
  { id: 15, title: "Physics Problems", dueDate: addDays(3), difficulty: "medium", estimatedMinutes: 120, taskType: "assignment", courseCode: "Phys 101", expectedPriority: "High" },
  { id: 16, title: "Calc Review", dueDate: addDays(3), difficulty: "medium", estimatedMinutes: 60, taskType: "quiz", courseCode: "Math 50", expectedPriority: "High" },
  { id: 17, title: "Ethics Essay", dueDate: addDays(1), difficulty: "medium", estimatedMinutes: 120, taskType: "assignment", courseCode: "GEC 4", expectedPriority: "High" },
  { id: 18, title: "DB Schema", dueDate: addDays(3), difficulty: "medium", estimatedMinutes: 180, taskType: "project", courseCode: "CS 104", expectedPriority: "High" },
  { id: 19, title: "Minor Exam", dueDate: addDays(3), difficulty: "hard", estimatedMinutes: 180, taskType: "exam", courseCode: "GEC 5", expectedPriority: "High" },
  { id: 20, title: "Net Lab", dueDate: addDays(2), difficulty: "medium", estimatedMinutes: 90, taskType: "lab", courseCode: "CS 205", expectedPriority: "High" },

  // --- MEDIUM (Moderate Minor / Long-term Major) ---
  { id: 21, title: "Art Essay", dueDate: addDays(4), difficulty: "easy", estimatedMinutes: 60, taskType: "assignment", courseCode: "GEC 6", expectedPriority: "Medium" },
  { id: 22, title: "Self Video", dueDate: addDays(5), difficulty: "medium", estimatedMinutes: 120, taskType: "project", courseCode: "GEC 1", expectedPriority: "Medium" },
  { id: 23, title: "CS Final Start", dueDate: addDays(14), difficulty: "hard", estimatedMinutes: 1000, taskType: "project", courseCode: "CS 102", expectedPriority: "Medium" }, 
  { id: 24, title: "Thesis Review", dueDate: addDays(10), difficulty: "medium", estimatedMinutes: 300, taskType: "study", courseCode: "THESIS 1", expectedPriority: "Medium" }, 
  { id: 25, title: "Math Workbook", dueDate: addDays(7), difficulty: "easy", estimatedMinutes: 45, taskType: "assignment", courseCode: "Math 101", expectedPriority: "Medium" },
  { id: 26, title: "History Quiz", dueDate: addDays(4), difficulty: "easy", estimatedMinutes: 30, taskType: "quiz", courseCode: "GEC 2", expectedPriority: "Medium" },
  { id: 27, title: "PE Dance", dueDate: addDays(5), difficulty: "medium", estimatedMinutes: 120, taskType: "presentation", courseCode: "PE 2", expectedPriority: "Medium" },
  { id: 28, title: "Pathfit Log", dueDate: addDays(3), difficulty: "easy", estimatedMinutes: 15, taskType: "other", "courseCode": "PATHFIT 1", expectedPriority: "Medium" },
  { id: 29, title: "Rizal Readings", dueDate: addDays(4), difficulty: "medium", estimatedMinutes: 60, taskType: "study", courseCode: "GEC 9", expectedPriority: "Medium" },
  { id: 30, title: "OS Install", dueDate: addDays(5), difficulty: "easy", estimatedMinutes: 60, taskType: "lab", courseCode: "CS 202", expectedPriority: "Medium" },

  // --- LOW (Long term Minor / Easy) ---
  { id: 31, title: "Adv Reading", dueDate: addDays(14), difficulty: "easy", estimatedMinutes: 30, taskType: "study", courseCode: "GEC 1", expectedPriority: "Low" },
  { id: 32, title: "Comm Service", dueDate: addDays(20), difficulty: "medium", estimatedMinutes: 60, taskType: "project", courseCode: "NSTP 2", expectedPriority: "Low" },
  { id: 33, title: "PE Uniform", dueDate: addDays(7), difficulty: "easy", estimatedMinutes: 10, taskType: "other", courseCode: "PE 1", expectedPriority: "Low" },
  { id: 34, title: "GEC Paper", dueDate: addDays(30), difficulty: "hard", estimatedMinutes: 300, taskType: "project", courseCode: "GEC 5", expectedPriority: "Low" }, 
  { id: 35, title: "Portfolio", dueDate: addDays(10), difficulty: "easy", estimatedMinutes: 45, taskType: "other", courseCode: "LTS 1", expectedPriority: "Low" },
  { id: 36, title: "Health Survey", dueDate: addDays(8), difficulty: "easy", estimatedMinutes: 15, taskType: "assignment", "courseCode": "PATHFIT 2", expectedPriority: "Low" },
  { id: 37, title: "Documentary", dueDate: addDays(12), difficulty: "easy", estimatedMinutes: 90, taskType: "study", courseCode: "GEC 3", expectedPriority: "Low" },
  { id: 38, title: "Feedback", dueDate: addDays(15), difficulty: "easy", estimatedMinutes: 10, taskType: "other", courseCode: "GEC 4", expectedPriority: "Low" },
  { id: 39, title: "Supplies", dueDate: addDays(7), difficulty: "easy", estimatedMinutes: 60, taskType: "other", "courseCode": "NSTP 1", expectedPriority: "Low" },
  { id: 40, "title": "GC Setup", dueDate: addDays(6), difficulty: "easy", estimatedMinutes: 5, taskType: "other", courseCode: "GEC 8", expectedPriority: "Low" },

  // --- MIXED EDGE CASES ---
  { id: 41, title: "Far Exam", dueDate: addDays(25), difficulty: "hard", estimatedMinutes: 400, taskType: "exam", courseCode: "CS 105", expectedPriority: "Medium" }, 
  { id: 42, title: "Tmrw Minor Exam", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 120, taskType: "exam", courseCode: "GEC 2", expectedPriority: "High" }, 
  { id: 43, title: "Quick Major", dueDate: addDays(4), difficulty: "easy", estimatedMinutes: 15, taskType: "assignment", courseCode: "CS 101", expectedPriority: "Medium" }, 
  { id: 44, title: "Hard Minor Today", dueDate: addDays(0), difficulty: "hard", estimatedMinutes: 180, taskType: "project", courseCode: "GEC 1", expectedPriority: "Critical" }, 
  { id: 45, title: "Easy Major Today", dueDate: addDays(0), difficulty: "easy", estimatedMinutes: 15, taskType: "quiz", courseCode: "Math 101", expectedPriority: "High" }, 
  { id: 46, title: "Mod Major", dueDate: addDays(4), difficulty: "medium", estimatedMinutes: 60, taskType: "assignment", courseCode: "CS 102", expectedPriority: "High" },
  { id: 47, title: "Long Major Heavy", dueDate: addDays(10), difficulty: "medium", estimatedMinutes: 400, taskType: "project", courseCode: "CS 106", expectedPriority: "Medium" },
  { id: 48, title: "Urgent Minor Low", dueDate: addDays(1), difficulty: "easy", estimatedMinutes: 10, taskType: "other", courseCode: "PE 2", expectedPriority: "High" },
  { id: 49, title: "Mod Minor Exam", dueDate: addDays(3), difficulty: "hard", estimatedMinutes: 120, taskType: "exam", courseCode: "GEC 5", expectedPriority: "High" },
  { id: 50, title: "Far Thesis", dueDate: addDays(60), difficulty: "hard", estimatedMinutes: 1000, taskType: "project", courseCode: "THESIS 2", expectedPriority: "Medium" },

  // ==========================================
  // NEW TASKS (IDs 51-100)
  // ==========================================

  // --- CRITICAL (Adding more varied subjects/types) ---
  { id: 51, title: "Final Defense", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 180, taskType: "presentation", courseCode: "THESIS 2", expectedPriority: "Critical" },
  { id: 52, title: "System Arch Exam", dueDate: addDays(0), difficulty: "hard", estimatedMinutes: 120, taskType: "exam", courseCode: "CS 301", expectedPriority: "Critical" },
  { id: 53, title: "Web Dev Project", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 480, taskType: "project", courseCode: "CS Elec 1", expectedPriority: "Critical" },
  { id: 54, title: "Discrete Math Quiz", dueDate: addDays(0), difficulty: "medium", estimatedMinutes: 45, taskType: "quiz", courseCode: "Math 102", expectedPriority: "Critical" },
  { id: 55, title: "Physics 2 Lab", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 150, taskType: "lab", courseCode: "Phys 2", expectedPriority: "Critical" },
  { id: 56, title: "AI Model Training", dueDate: addDays(1), difficulty: "hard", estimatedMinutes: 300, taskType: "project", courseCode: "CS 305", expectedPriority: "Critical" },
  { id: 57, title: "Late Reflection", dueDate: addDays(-1), difficulty: "easy", estimatedMinutes: 20, taskType: "assignment", courseCode: "GEC 3", expectedPriority: "Critical" },
  { id: 58, title: "Algorithm Problem Set", dueDate: addDays(1), difficulty: "medium", estimatedMinutes: 120, taskType: "assignment", courseCode: "CS 201", expectedPriority: "Critical" },
  { id: 59, title: "Team Meeting", dueDate: addDays(0), difficulty: "medium", estimatedMinutes: 60, taskType: "other", courseCode: "CS 105", expectedPriority: "Critical" },
  { id: 60, title: "Overdue PE Video", dueDate: addDays(-2), difficulty: "medium", estimatedMinutes: 90, taskType: "project", courseCode: "PE 3", expectedPriority: "Critical" },

  // --- HIGH (Testing boundary between Major/Minor) ---
  { id: 61, title: "InfoSec Research", dueDate: addDays(3), difficulty: "medium", estimatedMinutes: 120, taskType: "study", courseCode: "CS Elec 2", expectedPriority: "High" },
  { id: 62, title: "Calculus 2 Review", dueDate: addDays(2), difficulty: "hard", estimatedMinutes: 180, taskType: "study", courseCode: "Math 51", expectedPriority: "High" },
  { id: 63, title: "Group Report", dueDate: addDays(2), difficulty: "medium", estimatedMinutes: 90, taskType: "presentation", courseCode: "GEC 8", expectedPriority: "High" },
  { id: 64, title: "Mobile App UI", dueDate: addDays(3), difficulty: "hard", estimatedMinutes: 240, taskType: "project", courseCode: "CS 302", expectedPriority: "High" },
  { id: 65, title: "Physics Problem Set", dueDate: addDays(4), difficulty: "medium", estimatedMinutes: 120, taskType: "assignment", courseCode: "Phys 2", expectedPriority: "High" },
  { id: 66, title: "Statistics Quiz", dueDate: addDays(2), difficulty: "medium", estimatedMinutes: 45, taskType: "quiz", courseCode: "Math 103", expectedPriority: "High" },
  { id: 67, title: "Ethics Case Study", dueDate: addDays(3), difficulty: "medium", estimatedMinutes: 90, taskType: "assignment", courseCode: "GEC 4", expectedPriority: "High" },
  { id: 68, title: "Database Query Lab", dueDate: addDays(2), difficulty: "medium", estimatedMinutes: 120, taskType: "lab", courseCode: "CS 104", expectedPriority: "High" },
  { id: 69, title: "Minor Subject Final", dueDate: addDays(4), difficulty: "hard", estimatedMinutes: 180, taskType: "exam", courseCode: "GEC 9", expectedPriority: "High" },
  { id: 70, title: "Debugging Code", dueDate: addDays(2), difficulty: "medium", estimatedMinutes: 60, taskType: "lab", courseCode: "CS 102", expectedPriority: "High" },

  // --- MEDIUM (Long term but heavy, or moderate easy) ---
  { id: 71, title: "Science Tech Essay", dueDate: addDays(5), difficulty: "easy", estimatedMinutes: 45, taskType: "assignment", courseCode: "GEC 7", expectedPriority: "Medium" },
  { id: 72, title: "NSTP Community Plan", dueDate: addDays(6), difficulty: "medium", estimatedMinutes: 120, taskType: "project", courseCode: "NSTP 1", expectedPriority: "Medium" },
  { id: 73, title: "Operating Systems Study", dueDate: addDays(12), difficulty: "hard", estimatedMinutes: 400, taskType: "study", courseCode: "CS 203", expectedPriority: "Medium" },
  { id: 74, title: "Compiler Project Start", dueDate: addDays(20), difficulty: "hard", estimatedMinutes: 1200, taskType: "project", courseCode: "CS 304", expectedPriority: "Medium" },
  { id: 75, title: "Linear Algebra HW", dueDate: addDays(7), difficulty: "medium", estimatedMinutes: 60, taskType: "assignment", courseCode: "Math 104", expectedPriority: "Medium" },
  { id: 76, title: "Contemporary World Quiz", dueDate: addDays(5), difficulty: "easy", estimatedMinutes: 30, taskType: "quiz", courseCode: "GEC 3", expectedPriority: "Medium" },
  { id: 77, title: "PE Fitness Log", dueDate: addDays(4), difficulty: "easy", estimatedMinutes: 20, taskType: "other", courseCode: "PE 4", expectedPriority: "Medium" },
  { id: 78, title: "Software Eng Diagram", dueDate: addDays(6), difficulty: "medium", estimatedMinutes: 90, taskType: "assignment", courseCode: "CS 205", expectedPriority: "Medium" },
  { id: 79, title: "Automata Theory Read", dueDate: addDays(10), difficulty: "hard", estimatedMinutes: 180, taskType: "study", courseCode: "CS 303", expectedPriority: "Medium" },
  { id: 80, title: "Web Server Setup", dueDate: addDays(7), difficulty: "medium", estimatedMinutes: 60, taskType: "lab", courseCode: "CS Elec 1", expectedPriority: "Medium" },

  // --- LOW (Far future or very quick/easy) ---
  { id: 81, title: "Purposive Comm Reading", dueDate: addDays(15), difficulty: "easy", estimatedMinutes: 40, taskType: "study", courseCode: "GEC 5", expectedPriority: "Low" },
  { id: 82, title: "CWTS Journal", dueDate: addDays(25), difficulty: "easy", estimatedMinutes: 30, taskType: "assignment", courseCode: "NSTP 2", expectedPriority: "Low" },
  { id: 83, title: "Gym Uniform Buy", dueDate: addDays(10), difficulty: "easy", estimatedMinutes: 60, taskType: "other", courseCode: "PE 3", expectedPriority: "Low" },
  { id: 84, title: "GEC Final Project", dueDate: addDays(45), difficulty: "hard", estimatedMinutes: 300, taskType: "project", courseCode: "GEC 2", expectedPriority: "Low" },
  { id: 85, title: "Student Profile Update", dueDate: addDays(12), difficulty: "easy", estimatedMinutes: 15, taskType: "other", courseCode: "LTS 2", expectedPriority: "Low" },
  { id: 86, title: "Nutrition Survey", dueDate: addDays(14), difficulty: "easy", estimatedMinutes: 20, taskType: "assignment", "courseCode": "PATHFIT 3", expectedPriority: "Low" },
  { id: 87, title: "Watch Rizal Movie", dueDate: addDays(20), difficulty: "easy", estimatedMinutes: 120, taskType: "study", courseCode: "GEC 9", expectedPriority: "Low" },
  { id: 88, title: "Course Eval Survey", dueDate: addDays(30), difficulty: "easy", estimatedMinutes: 10, taskType: "other", courseCode: "GEC 1", expectedPriority: "Low" },
  { id: 89, title: "Buy Lab Materials", dueDate: addDays(8), difficulty: "easy", estimatedMinutes: 45, taskType: "other", courseCode: "CS 105", expectedPriority: "Low" },
  { id: 90, title: "Class Group Chat Join", dueDate: addDays(10), difficulty: "easy", estimatedMinutes: 5, taskType: "other", courseCode: "GEC Elec", expectedPriority: "Low" },

  // --- MIXED EDGE CASES 2 ---
  { id: 91, title: "Capstone Defense Far", dueDate: addDays(90), difficulty: "hard", estimatedMinutes: 600, taskType: "presentation", courseCode: "CS 401", expectedPriority: "Medium" },
  { id: 92, title: "Urgent Minor Easy", dueDate: addDays(1), difficulty: "easy", estimatedMinutes: 15, taskType: "assignment", courseCode: "GEC 6", expectedPriority: "High" },
  { id: 93, title: "Major Task Low Effort", dueDate: addDays(3), difficulty: "easy", estimatedMinutes: 20, taskType: "quiz", courseCode: "CS 101", expectedPriority: "Medium" },
  { id: 94, title: "Critical Minor Task", dueDate: addDays(0), difficulty: "hard", estimatedMinutes: 240, taskType: "project", courseCode: "GEC 4", expectedPriority: "Critical" },
  { id: 95, title: "Major Exam Far", dueDate: addDays(30), difficulty: "hard", estimatedMinutes: 300, taskType: "exam", courseCode: "CS 202", expectedPriority: "Medium" },
  { id: 96, title: "Moderate Major Task", dueDate: addDays(5), difficulty: "medium", estimatedMinutes: 60, taskType: "assignment", courseCode: "CS 301", expectedPriority: "Medium" },
  { id: 97, title: "Long Term Major Huge", dueDate: addDays(15), difficulty: "hard", estimatedMinutes: 800, taskType: "project", courseCode: "CS 402", expectedPriority: "Medium" },
  { id: 98, title: "Urgent Minor Other", dueDate: addDays(1), difficulty: "easy", estimatedMinutes: 10, taskType: "other", courseCode: "PE 1", expectedPriority: "High" },
  { id: 99, title: "Moderate Minor Exam", dueDate: addDays(4), difficulty: "hard", estimatedMinutes: 150, taskType: "exam", courseCode: "GEC 8", expectedPriority: "High" },
  { id: 100, title: "Far Thesis Proposal", dueDate: addDays(50), difficulty: "hard", estimatedMinutes: 500, taskType: "project", courseCode: "THESIS 1", expectedPriority: "Medium" },
];