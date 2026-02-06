import { Ionicons } from '@expo/vector-icons';
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
import CustomAlert from '@/components/Alerts';

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

interface CourseEvent {
  title: string;
  subtitle: string;
  start: Date;
  end: Date;
  note: string;
  courseCode: string;
  courseData: Course;
  color: { primary: string; light: string; dark: string };
}

function courseToEvents(course: Course, viewStart: Date, viewEnd: Date): CourseEvent[] {
  const events: CourseEvent[] = [];
  const color = getCourseColor(course.code);
  const schedules = parseTimeString(course.time);

  if (schedules.length === 0) return events;

  const semesterStart = dayjs('2026-01-01');
  const semesterEnd = dayjs('2026-05-31');

  // Only generate events for the visible range (with buffer)
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
          });
        }
        currentWeekDate = currentWeekDate.add(1, 'week');
      }
    }
  }
  return events;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mode, setMode] = useState<CalendarMode>('week');
  const [date, setDate] = useState(new Date());
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CourseEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
      loadCourses();
    }, [user])
  );

  const loadCourses = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const fetchedCourses = await getCourses(user.$id);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalUnits = () => {
    return courses.reduce((sum, course) => sum + (course.units || 0), 0);
  };

  const handleClearAllCourses = () => {
    if (!user) return;
    setShowMenu(false);
    Alert.alert(
      'Clear All Courses?',
      'This will delete all courses. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllCourses(user.$id);
              loadCourses();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to clear courses');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCourse = async (courseId: string) => {
    Alert.alert(
      "Delete Course",
      "Are you sure you want to delete this course?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              setSelectedEvent(null);
              loadCourses();
            } catch (error) {
              Alert.alert("Error", "Failed to delete course");
            }
          } 
        }
      ]
    );
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
    setSelectedEvent(event as CourseEvent);
  }, []);

  // Calculate visible date range based on current mode
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

  // Memoize events generation - only recalculate when courses or date range changes
  const events = useMemo(() => {
    const allEvents: CourseEvent[] = [];
    for (const course of courses) {
      const courseEvents = courseToEvents(course, dateRange.start, dateRange.end);
      allEvents.push(...courseEvents);
    }
    return allEvents;
  }, [courses, dateRange]);

  // Memoize event cell style function
  const eventCellStyle = useCallback((event: any) => {
    const courseEvent = event as CourseEvent;
    return {
      backgroundColor: courseEvent.color.primary,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: courseEvent.color.dark,
      padding: 4,
    };
  }, []);

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
            <Text style={styles.emptyTitle}>No Classes</Text>
            <Text style={styles.emptySubtitle}>Import a COR to get started.</Text>
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
          />
        )}
      </View>

      {/* MENU MODAL */}
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
                  <Ionicons name="calendar" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{events.length}</Text>
                <Text style={styles.statLabel}>Class Sessions</Text>
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
        visible={selectedEvent !== null}
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
            {selectedEvent && (
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

                  {/* ACTION BUTTONS (EDIT/DELETE) */}
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
                      onPress={() => handleDeleteCourse(selectedEvent.courseData.$id!)}
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

      {/* EDIT MODAL COMPONENT */}
      {selectedEvent && (
        <EditModal 
          visible={showEditModal}
          course={selectedEvent.courseData}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
            loadCourses();
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
  // NEW STYLES FOR BUTTONS
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
});