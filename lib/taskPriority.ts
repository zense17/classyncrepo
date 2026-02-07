// lib/taskPriority.ts
// Decision Tree Algorithm for Task Priority Classification
// OPTIMIZED V2 - Based on actual ground truth pattern analysis

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TaskType = 'exam' | 'project' | 'assignment' | 'quiz' | 'study' | 'lab' | 'presentation' | 'other';

export interface TaskInput {
  dueDate: Date | string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  taskType: TaskType;
  courseCode: string;
}

export interface PriorityResult {
  basePriority: Priority;
  finalPriority: Priority;
  isMajorSubject: boolean;
  urgencyLevel: 'overdue' | 'urgent' | 'soon' | 'moderate' | 'long-term';
  reasoning: string;
  recommendation: string;
}

// ============================================================
// MAJOR SUBJECT DETECTION
// ============================================================

const MAJOR_SUBJECT_PATTERNS = [
  /^CS\s?\d/i,
  /^Math/i,
  /^Phys/i,
  /^THESIS/i,
];

const MINOR_SUBJECT_PATTERNS = [
  /^GEC/i,
  /^NSTP/i,
  /^PATHFIT/i,
  /^PE/i,
  /^LTS/i,
];

export function isMajorSubject(courseCode: string): boolean {
  const normalizedCode = courseCode.trim().toUpperCase();
  for (const pattern of MAJOR_SUBJECT_PATTERNS) {
    if (pattern.test(normalizedCode)) {
      return true;
    }
  }
  return false;
}

export function isMinorSubject(courseCode: string): boolean {
  const normalizedCode = courseCode.trim().toUpperCase();
  for (const pattern of MINOR_SUBJECT_PATTERNS) {
    if (pattern.test(normalizedCode)) {
      return true;
    }
  }
  return false;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDaysUntilDue(dueDate: Date | string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function getRecommendation(priority: Priority, urgencyLevel: string): string {
  const recommendations: Record<Priority, Record<string, string>> = {
    'Critical': {
      'overdue': '🚨 OVERDUE! Complete immediately or contact instructor.',
      'urgent': '🚨 Start immediately! Clear your schedule for this task.',
      'soon': '⚠️ High priority - create a plan and start today.',
      'moderate': '⚠️ Important - begin working on this soon.',
      'long-term': '📋 Complex task - start planning now.',
    },
    'High': {
      'overdue': '⚠️ Overdue - complete as soon as possible.',
      'urgent': '⏰ Complete today - schedule time now.',
      'soon': '📝 Create a work plan and start this week.',
      'moderate': '📝 Schedule time to work on this.',
      'long-term': '🎯 Plan ahead for this task.',
    },
    'Medium': {
      'overdue': '📌 Complete soon.',
      'urgent': '📅 Add to today\'s schedule.',
      'soon': '📆 Schedule for this week.',
      'moderate': '📆 Add to your weekly plan.',
      'long-term': '✅ Schedule when convenient.',
    },
    'Low': {
      'overdue': '✓ Quick task - finish it now.',
      'urgent': '✓ Complete when you have time.',
      'soon': '📌 Add to your to-do list.',
      'moderate': '📌 Schedule for later this week.',
      'long-term': '📝 Add to backlog.',
    },
  };
  
  return recommendations[priority]?.[urgencyLevel] || 'Add to your task list.';
}

// ============================================================
// OPTIMIZED DECISION TREE ALGORITHM
// Based on ground truth pattern analysis
// ============================================================

/**
 * Decision Tree Rules (derived from ground truth):
 * 
 * CRITICAL:
 *   - Overdue (days < 0)
 *   - Urgent (days 0-1) AND major subject
 *   - Urgent (days 0-1) AND hard difficulty
 *   - Today (days = 0) AND hard (even if minor)
 * 
 * HIGH:
 *   - Urgent (days 0-1) AND minor AND NOT hard
 *   - Soon (days 2-3) AND major
 *   - Soon (days 2-4) AND hard difficulty
 *   - Moderate (days 4) AND major AND medium+ difficulty
 * 
 * MEDIUM:
 *   - Soon (days 3) AND minor AND easy
 *   - Moderate (days 4-5) AND minor
 *   - Moderate (days 5-6) AND major AND easy
 *   - Long-term (days 7+) AND major
 *   - Very long-term (days 14+) AND hard
 * 
 * LOW:
 *   - Moderate (days 6+) AND minor AND easy
 *   - Long-term (days 7+) AND minor
 */
export function calculatePriority(task: TaskInput): PriorityResult {
  const daysUntilDue = getDaysUntilDue(task.dueDate);
  const isMajor = isMajorSubject(task.courseCode);
  const isMinor = !isMajor;
  const { difficulty, estimatedMinutes, taskType } = task;
  
  let finalPriority: Priority;
  let urgencyLevel: 'overdue' | 'urgent' | 'soon' | 'moderate' | 'long-term';
  let reasoning: string;
  
  // ============ DECISION TREE ============
  
  // RULE 1: OVERDUE → Critical
  if (daysUntilDue < 0) {
    urgencyLevel = 'overdue';
    finalPriority = 'Critical';
    reasoning = `🚨 OVERDUE by ${Math.abs(daysUntilDue)} day(s)`;
  }
  
  // RULE 2: URGENT (0-1 days)
  else if (daysUntilDue <= 1) {
    urgencyLevel = 'urgent';
    
    // Urgent + Major → Critical
    if (isMajor) {
      finalPriority = 'Critical';
      reasoning = `⏰ URGENT (${daysUntilDue === 0 ? 'TODAY' : '1 day'}) + Major subject`;
    }
    // Urgent + Hard → Critical
    else if (difficulty === 'hard') {
      finalPriority = 'Critical';
      reasoning = `⏰ URGENT (${daysUntilDue === 0 ? 'TODAY' : '1 day'}) + Hard difficulty`;
    }
    // Urgent + Minor + Not Hard → High
    else {
      finalPriority = 'High';
      reasoning = `⏰ URGENT (${daysUntilDue === 0 ? 'TODAY' : '1 day'}) + Minor subject`;
    }
  }
  
  // RULE 3: SOON (2-3 days)
  else if (daysUntilDue >= 2 && daysUntilDue <= 3) {
    urgencyLevel = 'soon';
    
    // 2-3 days + Major → High
    if (isMajor) {
      finalPriority = 'High';
      reasoning = `📅 SOON (${daysUntilDue} days) + Major subject`;
    }
    // 2-3 days + Hard → High
    else if (difficulty === 'hard') {
      finalPriority = 'High';
      reasoning = `📅 SOON (${daysUntilDue} days) + Hard difficulty`;
    }
    // 3 days + Minor + Easy → Medium
    else if (daysUntilDue === 3 && difficulty === 'easy') {
      finalPriority = 'Medium';
      reasoning = `📅 SOON (${daysUntilDue} days) + Minor + Easy`;
    }
    // 2-3 days + Minor + Medium difficulty → High
    else if (difficulty === 'medium') {
      finalPriority = 'High';
      reasoning = `📅 SOON (${daysUntilDue} days) + Minor + Medium difficulty`;
    }
    // Default for 2-3 days
    else {
      finalPriority = 'Medium';
      reasoning = `📅 SOON (${daysUntilDue} days)`;
    }
  }
  
  // RULE 4: MODERATE (4-6 days)
  else if (daysUntilDue >= 4 && daysUntilDue <= 6) {
    urgencyLevel = 'moderate';
    
    // 4 days + Major + Medium/Hard → High
    if (daysUntilDue === 4 && isMajor && (difficulty === 'medium' || difficulty === 'hard')) {
      finalPriority = 'High';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Major + ${difficulty} difficulty`;
    }
    // 4 days + Hard (even minor) → High
    else if (daysUntilDue === 4 && difficulty === 'hard') {
      finalPriority = 'High';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Hard difficulty`;
    }
    // 4-5 days + Minor → Medium
    else if (isMinor && daysUntilDue <= 5) {
      finalPriority = 'Medium';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Minor subject`;
    }
    // 5-6 days + Major + Easy → Medium
    else if (isMajor && difficulty === 'easy') {
      finalPriority = 'Medium';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Major + Easy`;
    }
    // 6 days + Minor + Easy → Low
    else if (daysUntilDue === 6 && isMinor && difficulty === 'easy') {
      finalPriority = 'Low';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Minor + Easy`;
    }
    // 6 days + Minor → Low
    else if (daysUntilDue === 6 && isMinor) {
      finalPriority = 'Low';
      reasoning = `📆 MODERATE (${daysUntilDue} days) + Minor subject`;
    }
    // Default moderate
    else {
      finalPriority = 'Medium';
      reasoning = `📆 MODERATE (${daysUntilDue} days)`;
    }
  }
  
  // RULE 5: LONG-TERM (7-13 days)
  else if (daysUntilDue >= 7 && daysUntilDue <= 13) {
    urgencyLevel = 'long-term';
    
    // 7+ days + Major → Medium
    if (isMajor) {
      finalPriority = 'Medium';
      reasoning = `📆 LONG-TERM (${daysUntilDue} days) + Major subject`;
    }
    // 7+ days + Minor → Low
    else {
      finalPriority = 'Low';
      reasoning = `📆 LONG-TERM (${daysUntilDue} days) + Minor subject`;
    }
  }
  
  // RULE 6: VERY LONG-TERM (14+ days)
  else {
    urgencyLevel = 'long-term';
    
    // 14+ days + Major → Medium (even easy tasks need tracking)
    if (isMajor) {
      finalPriority = 'Medium';
      reasoning = `📆 VERY LONG-TERM (${daysUntilDue} days) + Major subject`;
    }
    // 14+ days + Hard → Medium (complex tasks need early planning)
    else if (difficulty === 'hard') {
      finalPriority = 'Medium';
      reasoning = `📆 VERY LONG-TERM (${daysUntilDue} days) + Hard difficulty`;
    }
    // 14+ days + Minor + Not Hard → Low
    else {
      finalPriority = 'Low';
      reasoning = `📆 VERY LONG-TERM (${daysUntilDue} days) + Minor subject`;
    }
  }
  
  return {
    basePriority: finalPriority,
    finalPriority,
    isMajorSubject: isMajor,
    urgencyLevel,
    reasoning,
    recommendation: getRecommendation(finalPriority, urgencyLevel),
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function getPriorityScore(priority: Priority): number {
  const scores: Record<Priority, number> = {
    'Critical': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1,
  };
  return scores[priority] || 0;
}

export function getPriorityStyles(priority: Priority) {
  switch (priority) {
    case 'Critical':
      return {
        cardBg: '#FFEBEE',
        accent: '#D32F2F',
        tagBg: '#FFCDD2',
        tagText: '#B71C1C',
      };
    case 'High':
      return {
        cardBg: '#FFF2F2',
        accent: '#EF5350',
        tagBg: '#FFEBEE',
        tagText: '#C62828',
      };
    case 'Medium':
      return {
        cardBg: '#FFFDE7',
        accent: '#FBC02D',
        tagBg: '#FFF9C4',
        tagText: '#F57F17',
      };
    case 'Low':
      return {
        cardBg: '#E8F5E9',
        accent: '#43A047',
        tagBg: '#C8E6C9',
        tagText: '#1B5E20',
      };
    default:
      return {
        cardBg: '#FFFFFF',
        accent: '#9E9E9E',
        tagBg: '#F5F5F5',
        tagText: '#616161',
      };
  }
}

export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  if (remainingMins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMins}m`;
}

export function getTaskTypeLabel(taskType: TaskType): string {
  const labels: Record<TaskType, string> = {
    exam: '📝 Exam',
    project: '🎯 Project',
    assignment: '📄 Assignment',
    quiz: '❓ Quiz',
    study: '📚 Study',
    lab: '🔬 Lab',
    presentation: '🎤 Presentation',
    other: '📋 Other',
  };
  return labels[taskType] || taskType;
}