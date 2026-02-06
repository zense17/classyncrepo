// lib/taskService.ts
// Task Database Operations (CRUD)
// Integrates with Appwrite database

import { ID, Query } from "react-native-appwrite";
import { databases } from "./appwrite";
import { 
  calculatePriority, 
  Priority, 
  Difficulty, 
  TaskType,
  formatEstimatedTime,
  getPriorityScore
} from "./taskPriority";

// ============================================================
// CONFIGURATION
// ============================================================

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const TASKS_COLLECTION_ID = process.env.EXPO_PUBLIC_TASKS_COLLECTION_ID!;

// ============================================================
// TYPES
// ============================================================

export interface Task {
  $id?: string;
  userId: string;
  title: string;
  description?: string;
  courseCode: string;
  courseName?: string;
  dueDate: string; // ISO string
  estimatedMinutes: number;
  difficulty: Difficulty;
  taskType: TaskType;
  
  // Auto-calculated by decision tree
  priority: Priority;
  basePriority: Priority;
  isMajorSubject: boolean;
  
  // Status
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  
  // Metadata
  createdAt: string;
  
  // Calendar sync (optional)
  calendarEventId?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  courseCode: string;
  courseName?: string;
  dueDate: Date | string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  taskType: TaskType;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  courseCode?: string;
  courseName?: string;
  dueDate?: Date | string;
  estimatedMinutes?: number;
  difficulty?: Difficulty;
  taskType?: TaskType;
  status?: 'pending' | 'in_progress' | 'completed';
}

// ============================================================
// CREATE TASK
// ============================================================

/**
 * Create a new task with auto-calculated priority
 */
export async function createTask(
  userId: string, 
  input: CreateTaskInput
): Promise<Task> {
  // Calculate priority using decision tree algorithm
  const priorityResult = calculatePriority({
    dueDate: input.dueDate,
    difficulty: input.difficulty,
    estimatedMinutes: input.estimatedMinutes,
    taskType: input.taskType,
    courseCode: input.courseCode,
  });
  
  const now = new Date().toISOString();
  const dueDate = input.dueDate instanceof Date 
    ? input.dueDate.toISOString() 
    : new Date(input.dueDate).toISOString();
  
  const taskData = {
    userId,
    title: input.title,
    description: input.description || '',
    courseCode: input.courseCode,
    courseName: input.courseName || '',
    dueDate,
    estimatedMinutes: input.estimatedMinutes,
    difficulty: input.difficulty,
    taskType: input.taskType,
    
    // Priority from decision tree
    priority: priorityResult.finalPriority,
    basePriority: priorityResult.basePriority,
    isMajorSubject: priorityResult.isMajorSubject,
    
    // Default status
    status: 'pending',
    
    // Timestamps
    createdAt: now,
  };
  
  console.log('Creating task with priority:', priorityResult.reasoning);
  
  const document = await databases.createDocument(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    ID.unique(),
    taskData
  );
  
  return document as unknown as Task;
}

// ============================================================
// READ TASKS
// ============================================================

/**
 * Get all tasks for a user
 */
export async function getTasks(userId: string): Promise<Task[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
    ]
  );
  
  return response.documents as unknown as Task[];
}

/**
 * Get tasks filtered by status
 */
export async function getTasksByStatus(
  userId: string, 
  status: 'pending' | 'in_progress' | 'completed'
): Promise<Task[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.equal('status', status),
      Query.orderDesc('createdAt'),
    ]
  );
  
  return response.documents as unknown as Task[];
}

/**
 * Get tasks filtered by priority
 */
export async function getTasksByPriority(
  userId: string, 
  priority: Priority
): Promise<Task[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.equal('priority', priority),
      Query.equal('status', 'pending'),
      Query.orderAsc('dueDate'),
    ]
  );
  
  return response.documents as unknown as Task[];
}

/**
 * Get pending tasks sorted by priority (for Smart Tasks view)
 */
export async function getPendingTasksSorted(userId: string): Promise<Task[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.notEqual('status', 'completed'),
      Query.orderAsc('dueDate'),
      Query.limit(100),
    ]
  );
  
  const tasks = response.documents as unknown as Task[];
  
  // Enhanced sorting with multiple tiebreakers
  return tasks.sort((a, b) => {
    // 1. Priority score (Critical > High > Medium > Low)
    const scoreA = getPriorityScore(a.priority);
    const scoreB = getPriorityScore(b.priority);
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    // 2. Major subjects first (within same priority)
    if (a.isMajorSubject !== b.isMajorSubject) {
      return a.isMajorSubject ? -1 : 1;
    }
    
    // 3. Harder tasks first (within same priority & major status)
    const diffScore: Record<string, number> = { hard: 3, medium: 2, easy: 1 };
    if (diffScore[b.difficulty] !== diffScore[a.difficulty]) {
      return diffScore[b.difficulty] - diffScore[a.difficulty];
    }
    
    // 4. Earlier due date first
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  const document = await databases.getDocument(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    taskId
  );
  
  return document as unknown as Task;
}

/**
 * Get tasks for a specific date (for calendar view)
 */
export async function getTasksForDate(
  userId: string, 
  date: Date
): Promise<Task[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.greaterThanEqual('dueDate', startOfDay.toISOString()),
      Query.lessThanEqual('dueDate', endOfDay.toISOString()),
      Query.orderAsc('dueDate'),
    ]
  );
  
  return response.documents as unknown as Task[];
}

/**
 * Get tasks within a date range (for calendar view)
 */
export async function getTasksInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Task[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.greaterThanEqual('dueDate', startDate.toISOString()),
      Query.lessThanEqual('dueDate', endDate.toISOString()),
      Query.notEqual('status', 'completed'),
      Query.orderAsc('dueDate'),
    ]
  );
  
  return response.documents as unknown as Task[];
}

// ============================================================
// UPDATE TASK
// ============================================================

/**
 * Update a task (recalculates priority if relevant fields change)
 */
export async function updateTask(
  taskId: string, 
  input: UpdateTaskInput
): Promise<Task> {
  // Get current task to check what's changing
  const currentTask = await getTask(taskId);
  
  // Merge with updates
  const updatedData: any = {
    ...input,
  };
  
  // If any priority-affecting field changed, recalculate priority
  const priorityFields = ['dueDate', 'difficulty', 'estimatedMinutes', 'taskType', 'courseCode'];
  const needsRecalculation = priorityFields.some(field => input[field as keyof UpdateTaskInput] !== undefined);
  
  if (needsRecalculation) {
    const priorityInput = {
      dueDate: input.dueDate || currentTask.dueDate,
      difficulty: input.difficulty || currentTask.difficulty,
      estimatedMinutes: input.estimatedMinutes ?? currentTask.estimatedMinutes,
      taskType: input.taskType || currentTask.taskType,
      courseCode: input.courseCode || currentTask.courseCode,
    };
    
    const priorityResult = calculatePriority(priorityInput);
    
    updatedData.priority = priorityResult.finalPriority;
    updatedData.basePriority = priorityResult.basePriority;
    updatedData.isMajorSubject = priorityResult.isMajorSubject;
    
    console.log('Recalculated priority:', priorityResult.reasoning);
  }
  
  // Handle date conversion
  if (updatedData.dueDate && updatedData.dueDate instanceof Date) {
    updatedData.dueDate = updatedData.dueDate.toISOString();
  }
  
  // Handle status change to completed
  if (input.status === 'completed' && currentTask.status !== 'completed') {
    updatedData.completedAt = new Date().toISOString();
  }
  
  const document = await databases.updateDocument(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    taskId,
    updatedData
  );
  
  return document as unknown as Task;
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { status: 'completed' });
}

/**
 * Mark task as in progress
 */
export async function startTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { status: 'in_progress' });
}

/**
 * Reopen a completed task
 */
export async function reopenTask(taskId: string): Promise<Task> {
  const document = await databases.updateDocument(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    taskId,
    {
      status: 'pending',
      completedAt: null,
    }
  );
  
  return document as unknown as Task;
}

// ============================================================
// DELETE TASK
// ============================================================

/**
 * Delete a single task
 */
export async function deleteTask(taskId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    TASKS_COLLECTION_ID,
    taskId
  );
}

/**
 * Delete all tasks for a user
 */
export async function deleteAllTasks(userId: string): Promise<void> {
  const tasks = await getTasks(userId);
  
  const deletePromises = tasks.map(task => deleteTask(task.$id!));
  await Promise.all(deletePromises);
}

/**
 * Delete all completed tasks for a user
 */
export async function deleteCompletedTasks(userId: string): Promise<void> {
  const tasks = await getTasksByStatus(userId, 'completed');
  
  const deletePromises = tasks.map(task => deleteTask(task.$id!));
  await Promise.all(deletePromises);
}

// ============================================================
// STATISTICS
// ============================================================

/**
 * Get task statistics for a user
 */
export async function getTaskStats(userId: string) {
  const allTasks = await getTasks(userId);
  
  const stats = {
    total: allTasks.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  for (const task of allTasks) {
    // Status counts
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'in_progress') stats.inProgress++;
    else if (task.status === 'completed') stats.completed++;
    
    // Priority counts (for non-completed tasks)
    if (task.status !== 'completed') {
      if (task.priority === 'Critical') stats.critical++;
      else if (task.priority === 'High') stats.high++;
      else if (task.priority === 'Medium') stats.medium++;
      else if (task.priority === 'Low') stats.low++;
      
      // Due date checks
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) stats.overdue++;
      else if (dueDate.getTime() === today.getTime()) stats.dueToday++;
      else if (dueDate <= weekFromNow) stats.dueThisWeek++;
    }
  }
  
  return stats;
}

// ============================================================
// RECALCULATE ALL PRIORITIES
// (Useful when app loads or date changes)
// ============================================================

/**
 * Recalculate priorities for all pending tasks
 * Call this daily or on app load to keep priorities accurate
 */
export async function recalculateAllPriorities(userId: string): Promise<void> {
  const tasks = await getTasks(userId);
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  
  for (const task of pendingTasks) {
    const priorityResult = calculatePriority({
      dueDate: task.dueDate,
      difficulty: task.difficulty,
      estimatedMinutes: task.estimatedMinutes,
      taskType: task.taskType,
      courseCode: task.courseCode,
    });
    
    // Only update if priority changed
    if (priorityResult.finalPriority !== task.priority) {
      await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        task.$id!,
        {
          priority: priorityResult.finalPriority,
          basePriority: priorityResult.basePriority,
        }
      );
      
      console.log(`Updated ${task.title}: ${task.priority} → ${priorityResult.finalPriority}`);
    }
  }
}