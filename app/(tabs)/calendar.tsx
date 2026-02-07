import { Ionicons, Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-big-calendar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/colors';
import { useAuth } from '@/lib/auth-context';
import { 
  getCourses, 
  Course, 
  deleteAllCourses, 
  parseTimeString, 
  deleteCourse 
} from '@/lib/database';
import { useFocusEffect } from 'expo-router';
import EditModal from '@/components/editModal'; 
import { getPendingTasksSorted, Task } from '@/lib/taskService';
import { getPriorityStyles, Priority } from '@/lib/taskPriority';

type CalendarMode = 'day' | 'week' | 'month';

// Day mapping
const DAY_MAP: Record<string, number> = {
  Sun: 0, Sunday: 0,
  Mon: 1, Monday: 1, M: 1,
  Tue: 2, Tuesday: 2, T: 2,
  Wed: 3, Wednesday: 3, W: 3,
  Thu: 4, Th: 4, Thursday: 4,
  Fri: 5, Friday: 5, F: 5,
  Sat: 6, Saturday: 6, S: 6,
};

// Color palette for courses
const COURSE_COLORS = [
  { primary: '#3B82F6', light: '#DBEAFE', dark: '#1E40AF' },
  { primary: '#10B981', light: '#D1FAE5', dark: '#047857' },
  { primary: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
  { primary: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
  { primary: '#8B5CF6', light: '#EDE9FE', dark: '#6D28D9' },
  { primary: '#EC4899', light: '#FCE7F3', dark: '#BE185D' },
  { primary: '#14B8A6', light: '#CCFBF1', dark: '#0F766E' },
  { primary: '#F97316', light: '#FFEDD5', dark: '#C2410C' },
];

function getCourseColor(courseCode: string) {
  const hash = courseCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

interface CalendarEvent {
  title: string;
  subtitle: string;
  start: Date;
  end: Date;
  note: string;
  courseCode: string;
  courseData: Course | null;
  color: { primary: string; light: string; dark: string };
  isTask?: boolean;
  taskData?: Task;
}

function courseToEvents(course: Course, viewStart: Date, viewEnd: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const color = getCourseColor(course.code);
  const schedules = parseTimeString(course.time);

  if (schedules.length === 0) return events;

  const semesterStart = dayjs('2026-01-01');
  const semesterEnd = dayjs('2026-05-31');

  const rangeStart = dayjs(viewStart).isBefore(semesterStart) ? semesterStart : dayjs(viewStart);
  const rangeEnd = dayjs(viewEnd).isAfter(semesterEnd) ? semesterEnd : dayjs(viewEnd);

  for (const schedule of schedules) {
    for (const dayStr of schedule.days) {
      const dayNum = DAY_MAP[dayStr];
      if (dayNum === undefined) continue;

      let currentWeekDate = rangeStart.startOf('week').add(dayNum, 'day');

      if (currentWeekDate.isBefore(rangeStart)) {
        currentWeekDate = currentWeekDate.add(1, 'week');
      }

      while (currentWeekDate.isBefore(rangeEnd) || currentWeekDate.isSame(rangeEnd, 'day')) {
        const startMatch = schedule.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        const endMatch = schedule.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

        if (startMatch && endMatch) {
          let startHour = parseInt(startMatch[1]);
          const startMin = parseInt(startMatch[2]);
          const startPeriod = startMatch[3].toUpperCase();

          let endHour = parseInt(endMatch[1]);
          const endMin = parseInt(endMatch[2]);
          const endPeriod = endMatch[3].toUpperCase();

          if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
          if (startPeriod === 'AM' && startHour === 12) startHour = 0;
          if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
          if (endPeriod === 'AM' && endHour === 12) endHour = 0;

          const start = currentWeekDate.hour(startHour).minute(startMin).toDate();
          const end = currentWeekDate.hour(endHour).minute(endMin).toDate();

          events.push({
            title: course.code,
            subtitle: course.title,
            start,
            end,
            note: course.room,
            courseCode: course.code,
            courseData: course,
            color,
            isTask: false,
          });
        }
        currentWeekDate = currentWeekDate.add(1, 'week');
      }
    }
  }
  return events;
}

function taskToEvents(tasks: Task[]): CalendarEvent[] {
  return tasks.map((task) => {
    const priorityStyles = getPriorityStyles(task.priority as Priority);
    const dueDate = dayjs(task.dueDate);

    const start = dueDate.toDate();
    const end = dueDate.add(1, 'hour').toDate();

    return {
      title: `📌 ${task.title}`,
      subtitle: `${task.courseCode} • ${task.priority}`,
      start,
      end,
      note: `${task.priority} Priority • ${task.taskType}`,
      courseCode: task.courseCode,
      courseData: null,
      color: {
        primary: priorityStyles.accent,
        light: priorityStyles.cardBg,
        dark: priorityStyles.tagText,
      },
      isTask: true,
      taskData: task,
    };
  });
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mode, setMode] = useState<CalendarMode>('week');
  const [date, setDate] = useState(new Date());
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // --- Modal States ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; code: string } | null>(null);
  const [clearAllModalVisible, setClearAllModalVisible] = useState(false);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const TAB_BAR_HEIGHT = 75;
  const HEADER_HEIGHT = 64;
  const MODE_SWITCHER_HEIGHT = 56;

  const CALENDAR_HEIGHT =
    SCREEN_HEIGHT -
    TAB_BAR_HEIGHT -
    HEADER_HEIGHT -
    MODE_SWITCHER_HEIGHT -
    insets.top;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const fetchedCourses = await getCourses(user.$id);
      setCourses(fetchedCourses);

      const fetchedTasks = await getPendingTasksSorted(user.$id);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalUnits = () => {
    return courses.reduce((sum, course) => sum + (course.units || 0), 0);
  };

  // --- Actions ---

  const handleClearAllCourses = () => {
    if (!user) return;
    setShowMenu(false); // Close menu first
    setClearAllModalVisible(true); // Open custom modal
  };

  const confirmClearAll = async () => {
    if (!user) return;
    try {
      await deleteAllCourses(user.$id);
      setClearAllModalVisible(false);
      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to clear courses');
    }
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse(courseToDelete.id);
      setDeleteModalVisible(false);
      setCourseToDelete(null);
      setSelectedEvent(null);
      loadData();
    } catch (error) {
      Alert.alert("Error", "Failed to delete course");
    }
  };

  const handlePrev = () => {
    const unit = mode === 'month' ? 'month' : mode === 'week' ? 'week' : 'day';
    setDate(dayjs(date).subtract(1, unit).toDate());
  };

  const handleNext = () => {
    const unit = mode === 'month' ? 'month' : mode === 'week' ? 'week' : 'day';
    setDate(dayjs(date).add(1, unit).toDate());
  };

  const handleDateTitlePress = () => setDate(new Date());

  const handleEventPress = useCallback((event: any) => {
    setSelectedEvent(event as CalendarEvent);
  }, []);

  const dateRange = useMemo(() => {
    const currentDate = dayjs(date);
    let start: Date, end: Date;

    if (mode === 'month') {
      start = currentDate.startOf('month').subtract(7, 'days').toDate();
      end = currentDate.endOf('month').add(7, 'days').toDate();
    } else if (mode === 'week') {
      start = currentDate.startOf('week').subtract(7, 'days').toDate();
      end = currentDate.endOf('week').add(7, 'days').toDate();
    } else {
      start = currentDate.subtract(1, 'day').toDate();
      end = currentDate.add(1, 'day').toDate();
    }

    return { start, end };
  }, [date, mode]);

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    for (const course of courses) {
      const courseEvents = courseToEvents(course, dateRange.start, dateRange.end);
      allEvents.push(...courseEvents);
    }

    const taskEvents = taskToEvents(tasks).filter((e) => {
      const eventDay = dayjs(e.start);
      return (
        (eventDay.isAfter(dayjs(dateRange.start)) || eventDay.isSame(dayjs(dateRange.start), 'day')) &&
        (eventDay.isBefore(dayjs(dateRange.end)) || eventDay.isSame(dayjs(dateRange.end), 'day'))
      );
    });
    allEvents.push(...taskEvents);

    return allEvents;
  }, [courses, tasks, dateRange]);

  const eventCellStyle = useCallback((event: any) => {
    const calEvent = event as CalendarEvent;

    if (calEvent.isTask) {
      return {
        backgroundColor: calEvent.color.light,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: calEvent.color.primary,
        padding: 4,
      };
    }

    return {
      backgroundColor: calEvent.color.primary,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: calEvent.color.dark,
      padding: 4,
    };
  }, []);

  const renderEvent = useCallback((event: any, touchableOpacityProps: any) => {
    const calEvent = event as CalendarEvent;
    const textColor = calEvent.isTask ? calEvent.color.dark : '#FFFFFF';

    // Destructure key out to satisfy React's "don't spread key" warning
    const { key, ...otherProps } = touchableOpacityProps;

    return (
      <TouchableOpacity key={key} {...otherProps}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textColor }} numberOfLines={1}>
            {calEvent.title}
          </Text>
          {mode !== 'month' && (
            <Text style={{ fontSize: 9, color: textColor, opacity: 0.9 }} numberOfLines={1}>
              {calEvent.note}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [mode]);

  const formatTaskDueInfo = (task: Task) => {
    const due = dayjs(task.dueDate);
    const today = dayjs().startOf('day');
    const diffDays = due.diff(today, 'day');

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, color: '#D32F2F' };
    if (diffDays === 0) return { text: 'Due Today', color: '#FF9800' };
    if (diffDays === 1) return { text: 'Due Tomorrow', color: '#F57F17' };
    return { text: due.format('MMM D, YYYY'), color: '#666' };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor={Colors.navBackground} />

      {/* HEADER */}
      <View style={[styles.header, { height: HEADER_HEIGHT }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.title} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDateTitlePress} activeOpacity={0.7} style={{ flex: 1 }}>
            <Text style={styles.dateTitle}>
              {dayjs(date).format('MMMM YYYY')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={Colors.title} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.title} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODE SWITCHER */}
      <View style={[styles.modeContainer, { height: MODE_SWITCHER_HEIGHT }]}>
        <View style={styles.modeSwitcher}>
          {(['day', 'week', 'month'] as CalendarMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CALENDAR */}
      <View style={styles.calendarWrapper}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#B0BEC5" />
            <Text style={styles.emptyTitle}>No Classes or Tasks</Text>
            <Text style={styles.emptySubtitle}>Import a COR or add tasks to get started.</Text>
          </View>
        ) : (
          <Calendar
            events={events}
            height={CALENDAR_HEIGHT}
            mode={mode}
            date={date}
            onSwipeEnd={(d) => setDate(d as Date)}
            swipeEnabled={true}
            onPressEvent={handleEventPress}
            eventCellStyle={eventCellStyle}
            renderEvent={renderEvent}
          />
        )}
      </View>

      {/* MENU MODAL (Stats & Clear All) */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContent} onStartShouldSetResponder={() => true}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Schedule Info</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="book" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{courses.length}</Text>
                <Text style={styles.statLabel}>Total Courses</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="school" size={24} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{getTotalUnits()}</Text>
                <Text style={styles.statLabel}>Total Units</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="checkbox-outline" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{tasks.length}</Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </View>
            </View>

            <View style={styles.menuActions}>
              <TouchableOpacity 
                style={styles.dangerButton}
                onPress={handleClearAllCourses}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={styles.dangerButtonText}>Clear All Courses</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuFooter}>
              <Text style={styles.footerText}>User: {user?.$id?.substring(0, 8)}...</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* COURSE DETAILS MODAL */}
      <Modal
        visible={selectedEvent !== null && !selectedEvent?.isTask}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEvent(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {selectedEvent && !selectedEvent.isTask && selectedEvent.courseData && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.colorIndicator, { backgroundColor: selectedEvent.color.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalCourseCode}>{selectedEvent.courseData.code}</Text>
                    <Text style={styles.modalCourseTitle}>{selectedEvent.courseData.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="time-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>
                        {dayjs(selectedEvent.start).format('h:mm A')} - {dayjs(selectedEvent.end).format('h:mm A')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Day</Text>
                      <Text style={styles.detailValue}>
                        {dayjs(selectedEvent.start).format('dddd, MMMM D, YYYY')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="location-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Room</Text>
                      <Text style={styles.detailValue}>{selectedEvent.courseData.room}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="person-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Faculty</Text>
                      <Text style={styles.detailValue}>{selectedEvent.courseData.faculty}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="school-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Units</Text>
                      <Text style={styles.detailValue}>{selectedEvent.courseData.units} units</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => setShowEditModal(true)}
                    >
                      <Ionicons name="create-outline" size={20} color="white" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => {
                        setCourseToDelete({ 
                          id: selectedEvent.courseData!.$id!, 
                          code: selectedEvent.courseData!.code 
                        });
                        setDeleteModalVisible(true);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* TASK DETAILS MODAL */}
      <Modal
        visible={selectedEvent !== null && selectedEvent?.isTask === true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEvent(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {selectedEvent && selectedEvent.isTask && selectedEvent.taskData && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.colorIndicator, { backgroundColor: selectedEvent.color.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalCourseCode}>{selectedEvent.taskData.title}</Text>
                    <Text style={styles.modalCourseTitle}>
                      {selectedEvent.taskData.courseCode} • Task
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, { backgroundColor: selectedEvent.color.light }]}>
                      <Ionicons name="flag-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <Text style={[styles.detailValue, { color: selectedEvent.color.primary }]}>
                        {selectedEvent.taskData.priority} Priority
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Deadline</Text>
                      <Text style={[
                        styles.detailValue, 
                        { color: formatTaskDueInfo(selectedEvent.taskData).color }
                      ]}>
                        {formatTaskDueInfo(selectedEvent.taskData).text}
                      </Text>
                      <Text style={styles.detailTime}>
                        {dayjs(selectedEvent.taskData.dueDate).format('h:mm A')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="document-text-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>
                        {selectedEvent.taskData.taskType.charAt(0).toUpperCase() + selectedEvent.taskData.taskType.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="speedometer-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Difficulty</Text>
                      <Text style={styles.detailValue}>
                        {selectedEvent.taskData.difficulty.charAt(0).toUpperCase() + selectedEvent.taskData.difficulty.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="time-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Estimated Time</Text>
                      <Text style={styles.detailValue}>
                        {selectedEvent.taskData.estimatedMinutes < 60
                          ? `${selectedEvent.taskData.estimatedMinutes} mins`
                          : `${Math.floor(selectedEvent.taskData.estimatedMinutes / 60)}h ${selectedEvent.taskData.estimatedMinutes % 60}m`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="book-outline" size={20} color={selectedEvent.color.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Course</Text>
                      <Text style={styles.detailValue}>{selectedEvent.taskData.courseCode}</Text>
                    </View>
                  </View>

                  {selectedEvent.taskData.isMajorSubject && (
                    <View style={styles.majorSubjectBadge}>
                      <Text style={styles.majorSubjectText}>⭐ Major Subject</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CONFIRM DELETE COURSE MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalIconBg}>
              <Feather name="trash-2" size={28} color="#EF5350" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Delete Course?</Text>
            <Text style={styles.deleteModalSubtitle}>
              Are you sure you want to remove {courseToDelete?.code}? This will also affect linked tasks in your schedule.
            </Text>

            <View style={styles.deleteModalActionRow}>
              <TouchableOpacity 
                style={styles.deleteModalCancelBtn} 
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteModalConfirmBtn} 
                onPress={confirmDeleteCourse}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REDESIGNED CLEAR ALL CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={clearAllModalVisible}
        onRequestClose={() => setClearAllModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={[styles.deleteModalIconBg, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="warning-outline" size={32} color="#FB8C00" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Clear Everything?</Text>
            <Text style={styles.deleteModalSubtitle}>
              This will permanently delete all courses and their schedules. This action cannot be reversed.
            </Text>

            <View style={styles.deleteModalActionRow}>
              <TouchableOpacity 
                style={styles.deleteModalCancelBtn} 
                onPress={() => setClearAllModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteModalConfirmBtn, { backgroundColor: '#EF5350' }]} 
                onPress={confirmClearAll}
              >
                <Text style={styles.deleteModalConfirmText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedEvent && selectedEvent.courseData && !selectedEvent.isTask && (
        <EditModal 
          visible={showEditModal}
          course={selectedEvent.courseData}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
            loadData();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navBackground },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.mutedText },
  header: {
    backgroundColor: Colors.navBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(111, 170, 170, 0.15)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.title,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navBackground, borderBottomWidth: 1, borderBottomColor: 'rgba(111, 170, 170, 0.15)', paddingHorizontal: 20 },
  modeSwitcher: { flexDirection: 'row', backgroundColor: Colors.uiBackground, borderRadius: 24, padding: 3, gap: 4, borderWidth: 1, borderColor: 'rgba(111, 170, 170, 0.2)' },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: Colors.secondary },
  modeText: { color: Colors.mutedText, fontWeight: '600', fontSize: 13 },
  modeTextActive: { color: '#FFFFFF', fontWeight: '700' },
  calendarWrapper: { flex: 1, backgroundColor: Colors.navBackground },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.title, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.mutedText, textAlign: 'center' },
  
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2F2A',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2F2A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  menuActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  menuFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  colorIndicator: {
    width: 6,
    height: 50,
    borderRadius: 3,
  },
  modalCourseCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2F2A',
    marginBottom: 2,
  },
  modalCourseTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  detailTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  majorSubjectBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  majorSubjectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  // --- New Modal Styles ---
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  deleteModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#EF5350',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});