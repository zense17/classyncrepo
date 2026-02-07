import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { getCurriculumByUser, updateSubjectGrade, type CurriculumSubject } from '@/lib/database';
import GradeUploadModal from '@/components/GradeUploadModal';

type SubjectStatus = 'completed' | 'ongoing' | 'upcoming';

interface GroupedSubjects {
  [year: string]: {
    [semester: string]: CurriculumSubject[];
  };
}

export default function CurriculumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [statusSelectorVisible, setStatusSelectorVisible] = useState<string | null>(null);
  const [statusSelectorPosition, setStatusSelectorPosition] = useState({ x: 0, y: 0 });

  // Load curriculum on focus
  useFocusEffect(
    useCallback(() => {
      loadCurriculum();
    }, [user?.$id])
  );

  const loadCurriculum = async () => {
    if (!user?.$id) return;
    
    try {
      setLoading(true);
      console.log('\n🔄 ===== LOADING CURRICULUM =====');
      console.log('📚 Loading curriculum for user:', user.$id);
      const curriculumData = await getCurriculumByUser(user.$id);
      console.log(`📚 Database returned ${curriculumData.length} curriculum subjects`);
      
      // Debug: Log first subject structure
      if (curriculumData.length > 0) {
        console.log('🔍 Sample subject structure:', JSON.stringify(curriculumData[0], null, 2));
      }
      
      // Log subjects with grades
      const subjectsWithGrades = curriculumData.filter(s => s.grade != null && s.grade !== undefined);
      console.log(`✅ Subjects with grades: ${subjectsWithGrades.length}`);
      
      if (subjectsWithGrades.length > 0) {
        console.log('📊 Grades found:');
        subjectsWithGrades.forEach(s => {
          console.log(`   ${s.subjectCode}: ${s.grade} (type: ${typeof s.grade}, value: ${JSON.stringify(s.grade)})`);
        });
      } else {
        console.log('⚠️ NO GRADES FOUND IN DATABASE!');
      }
      
      console.log('===== END LOADING =====\n');
      
      setSubjects(curriculumData);
      
      // Auto-select first year with subjects
      if (curriculumData.length > 0) {
        const firstYear = curriculumData[0].yearLevel;
        setSelectedYear(firstYear);
      }
    } catch (error) {
      console.error('Error loading curriculum:', error);
      Alert.alert('Error', 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  // Calculate GWA for a specific semester
  const calculateSemesterGWA = (semesterSubjects: CurriculumSubject[]): string => {
    const graded = semesterSubjects.filter(s => {
      const grade = parseFloat(s.grade?.toString() || '0');
      return !isNaN(grade) && grade > 0;
    });
    if (graded.length === 0) return 'N/A';
    
    const totalPoints = graded.reduce((sum, s) => {
      const grade = parseFloat(s.grade!.toString());
      return sum + (grade * s.units);
    }, 0);
    const totalUnits = graded.reduce((sum, s) => sum + s.units, 0);
    
    return (totalPoints / totalUnits).toFixed(2);
  };

  // Calculate GWA for a specific year
  const calculateYearGWA = (year: string): string => {
    const yearSubjects = subjects.filter(s => s.yearLevel === year);
    const graded = yearSubjects.filter(s => {
      const grade = parseFloat(s.grade?.toString() || '0');
      return !isNaN(grade) && grade > 0;
    });
    if (graded.length === 0) return 'N/A';
    
    const totalPoints = graded.reduce((sum, s) => {
      const grade = parseFloat(s.grade!.toString());
      return sum + (grade * s.units);
    }, 0);
    const totalUnits = graded.reduce((sum, s) => sum + s.units, 0);
    
    return (totalPoints / totalUnits).toFixed(2);
  };

  // Calculate overall GWA
  const calculateOverallGWA = (): string => {
    const graded = subjects.filter(s => {
      const grade = parseFloat(s.grade?.toString() || '0');
      return !isNaN(grade) && grade > 0;
    });
    if (graded.length === 0) return 'N/A';
    
    const totalPoints = graded.reduce((sum, s) => {
      const grade = parseFloat(s.grade!.toString());
      return sum + (grade * s.units);
    }, 0);
    const totalUnits = graded.reduce((sum, s) => sum + s.units, 0);
    
    return (totalPoints / totalUnits).toFixed(2);
  };

  // Calculate progress
  const calculateProgress = () => {
    const completed = subjects.filter(s => {
      const grade = parseFloat(s.grade?.toString() || '0');
      return s.status === 'completed' || (!isNaN(grade) && grade > 0);
    }).length;
    const total = subjects.length;
    const ongoing = subjects.filter(s => s.status === 'ongoing').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, ongoing, percentage };
  };

  // Group subjects by year and semester
  const groupSubjects = (): GroupedSubjects => {
    return subjects.reduce((acc, subject) => {
      const year = subject.yearLevel;
      const semester = subject.semester;
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][semester]) acc[year][semester] = [];
      
      acc[year][semester].push(subject);
      return acc;
    }, {} as GroupedSubjects);
  };

  // Get status color
  const getStatusColor = (subject: CurriculumSubject): string => {
    const grade = parseFloat(subject.grade?.toString() || '0');
    if (!isNaN(grade) && grade > 0) return '#4CAF50'; // completed
    if (subject.status === 'ongoing') return '#2196F3'; // ongoing
    return '#9E9E9E'; // upcoming
  };

  // Get status badge
  const getStatusBadge = (subject: CurriculumSubject): string => {
    const grade = parseFloat(subject.grade?.toString() || '0');
    if (!isNaN(grade) && grade > 0) return '✓';
    if (subject.status === 'ongoing') return '○';
    return '—';
  };

  // Get status text
  const getStatusText = (subject: CurriculumSubject): string => {
    const grade = parseFloat(subject.grade?.toString() || '0');
    if (!isNaN(grade) && grade > 0) return 'completed';
    if (subject.status === 'ongoing') return 'ongoing';
    return 'upcoming';
  };

  // Handle grade update
  const handleGradeUpdate = async (subjectId: string, grade: string) => {
    if (!user?.$id) return;
    
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue) || gradeValue < 1.0 || gradeValue > 5.0) {
      Alert.alert('Invalid Grade', 'Grade must be between 1.0 and 5.0');
      return;
    }
    
    try {
      await updateSubjectGrade(subjectId, gradeValue);
      
      // Update local state
      setSubjects(prev => prev.map(s => 
        s.$id === subjectId ? { ...s, grade: gradeValue, status: 'completed' as SubjectStatus } : s
      ));
      
      setEditingGrade(null);
    } catch (error) {
      console.error('Error updating grade:', error);
      Alert.alert('Error', 'Failed to update grade');
    }
  };

  // Handle file upload - opens modal
  const handleUploadGrades = () => {
    setUploadModalVisible(true);
  };

  // Handle grades updated - reload curriculum
  const handleGradesUpdated = () => {
    loadCurriculum();
  };

  const progress = calculateProgress();
  const overallGWA = calculateOverallGWA();
  const groupedSubjects = groupSubjects();
  const yearGWA = calculateYearGWA(selectedYear);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading curriculum...</Text>
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>📚 My Curriculum</Text>
            <Text style={styles.headerSubtitle}>Track your academic progress and grades</Text>
          </View>
        </View>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Curriculum Found</Text>
          <Text style={styles.emptyText}>Please scan your curriculum first from the home screen.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>📚 My Curriculum</Text>
            <Text style={styles.headerSubtitle}>Track your academic progress and grades</Text>
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Curriculum Progress</Text>
              <Text style={styles.progressSubtitle}>
                {progress.completed} of {progress.total} subjects completed
              </Text>
            </View>
            <View style={styles.overallGWAContainer}>
              <Text style={styles.overallGWAValue}>{overallGWA}</Text>
              <Text style={styles.overallGWALabel}>OVERALL GWA</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statText}>Completed: {progress.completed}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statText}>Ongoing: {progress.ongoing}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={styles.statText}>Upcoming: {progress.total - progress.completed - progress.ongoing}</Text>
            </View>
          </View>
        </View>

        {/* Upload Button (above tabs, right aligned) */}
        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadGrades}>
            <Text style={styles.uploadButtonText}>📤 Upload Grades</Text>
          </TouchableOpacity>
        </View>

        {/* Year Tabs (4 equal columns, all visible) */}
        <View style={styles.yearTabsContainer}>
          {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
            <TouchableOpacity
              key={year}
              style={[styles.yearTab, selectedYear === year && styles.yearTabActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearTabText, selectedYear === year && styles.yearTabTextActive]}>
                {year.replace(' Year', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Year GWA */}
        {groupedSubjects[selectedYear] && (
          <View style={styles.yearGWACard}>
            <Text style={styles.yearGWALabel}>📊 {selectedYear} GWA</Text>
            <Text style={styles.yearGWAValue}>{yearGWA}</Text>
          </View>
        )}

        {/* Semesters */}
        {groupedSubjects[selectedYear] && Object.entries(groupedSubjects[selectedYear])
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([semester, semesterSubjects]) => {
            const semesterGWA = calculateSemesterGWA(semesterSubjects);
            const totalUnits = semesterSubjects.reduce((sum, s) => sum + s.units, 0);

            return (
              <View key={semester} style={styles.semesterCard}>
                {/* Semester Header */}
                <View style={styles.semesterHeader}>
                  <View>
                    <Text style={styles.semesterTitle}>{semester}</Text>
                    <Text style={styles.semesterSubtitle}>
                      {semesterSubjects.length} subjects • {totalUnits} units
                    </Text>
                  </View>
                  <View style={styles.semesterGWAContainer}>
                    <Text style={styles.semesterGWAValue}>{semesterGWA}</Text>
                    <Text style={styles.semesterGWALabel}>SEM GWA</Text>
                  </View>
                </View>

                {/* Compact Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.colStatus]}></Text>
                  <Text style={[styles.tableHeaderText, styles.colCode]}>CODE</Text>
                  <Text style={[styles.tableHeaderText, styles.colTitle]}>TITLE</Text>
                  <Text style={[styles.tableHeaderText, styles.colUnit]}>L</Text>
                  <Text style={[styles.tableHeaderText, styles.colUnit]}>B</Text>
                  <Text style={[styles.tableHeaderText, styles.colUnit]}>U</Text>
                  <Text style={[styles.tableHeaderText, styles.colGrade]}>GRADE</Text>
                </View>

                {/* Subject Rows - Compact */}
                {semesterSubjects.map((subject, index) => {
                  if (!subject) return null; // Safety check
                  
                  const statusColor = getStatusColor(subject);
                  const statusBadge = getStatusBadge(subject);
                  const subjectKey = subject.$id || `${semester}-${index}`;
                  const isEditing = editingGrade === subject.$id;
                  const hasGrade = subject.grade != null && parseFloat(subject.grade.toString()) > 0;

                  return (
                    <View key={subjectKey} style={styles.subjectRow}>
                      {/* Status Badge - Hold to Show Selector (if no grade) */}
                      <View 
                        style={styles.colStatus}
                        onStartShouldSetResponder={() => {
                          // Only allow status change if no grade
                          return !hasGrade;
                        }}
                        onResponderGrant={(e) => {
                          if (!subject.$id) return;
                          if (hasGrade) return; // Don't show selector if has grade
                          
                          const { pageX, pageY } = e.nativeEvent;
                          setStatusSelectorPosition({ x: pageX, y: pageY });
                          setStatusSelectorVisible(subject.$id);
                        }}
                        onResponderRelease={() => {
                          setStatusSelectorVisible(null);
                        }}
                      >
                        <View style={[
                          styles.statusBadgeContainer,
                          { backgroundColor: statusColor + '20' },
                          hasGrade && styles.statusBadgeContainerLocked
                        ]}>
                          <Text style={[styles.statusBadge, { color: statusColor }]}>
                            {statusBadge}
                          </Text>
                        </View>
                      </View>

                      {/* Code */}
                      <View style={styles.colCode}>
                        <Text style={styles.subjectCode} numberOfLines={1}>
                          {subject.subjectCode}
                        </Text>
                      </View>

                      {/* Title */}
                      <View style={styles.colTitle}>
                        <Text style={styles.subjectName} numberOfLines={2}>
                          {subject.subjectName}
                        </Text>
                      </View>

                      {/* Units - Compact */}
                      <Text style={[styles.unitCell, styles.colUnit]}>{subject.lecUnits}</Text>
                      <Text style={[styles.unitCell, styles.colUnit]}>{subject.labUnits}</Text>
                      <Text style={[styles.unitCellBold, styles.colUnit]}>{subject.units}</Text>

                      {/* Grade Input - Always Editable */}
                      <View style={styles.colGrade}>
                        <TextInput
                          style={[
                            styles.gradeInput,
                            subject.grade != null && styles.gradeInputFilled,
                            isEditing && styles.gradeInputEditing,
                          ]}
                          value={
                            subject.grade != null 
                              ? parseFloat(subject.grade.toString()).toFixed(2)
                              : ''
                          }
                          placeholder="—"
                          placeholderTextColor="#CCC"
                          keyboardType="decimal-pad"
                          maxLength={4}
                          selectTextOnFocus={true}
                          onFocus={() => {
                            if (subject.$id) setEditingGrade(subject.$id);
                          }}
                          onBlur={() => {
                            setEditingGrade(null);
                            // Auto-save on blur if valid
                            if (subject.$id && subject.grade != null) {
                              const gradeNum = parseFloat(subject.grade.toString());
                              if (!isNaN(gradeNum) && gradeNum >= 1.0 && gradeNum <= 5.0) {
                                handleGradeUpdate(subject.$id, gradeNum.toString());
                              }
                            }
                          }}
                          onChangeText={(text) => {
                            if (!subject.$id) return;
                            // Allow empty or valid decimal input
                            if (text === '') {
                              setSubjects(prev => prev.map(s => 
                                s.$id === subject.$id ? { ...s, grade: null } : s
                              ));
                            } else {
                              const parsed = parseFloat(text);
                              if (!isNaN(parsed)) {
                                setSubjects(prev => prev.map(s => 
                                  s.$id === subject.$id ? { ...s, grade: parsed } : s
                                ));
                              }
                            }
                          }}
                          onSubmitEditing={() => {
                            if (subject.$id && subject.grade != null) {
                              const gradeNum = parseFloat(subject.grade.toString());
                              if (!isNaN(gradeNum)) {
                                handleGradeUpdate(subject.$id, gradeNum.toString());
                              }
                            }
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend & Controls</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendIcon, { color: '#4CAF50' }]}>✓</Text>
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendIcon, { color: '#2196F3' }]}>○</Text>
              <Text style={styles.legendText}>Ongoing</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendIcon, { color: '#9E9E9E' }]}>—</Text>
              <Text style={styles.legendText}>Upcoming</Text>
            </View>
          </View>
          <Text style={styles.legendNote}>💡 L=Lec, B=Lab, U=Units</Text>
          <Text style={styles.legendNote}>📝 Tap grade to edit • Hold status icon to change (if no grade)</Text>
          <Text style={styles.legendNote}>🔒 Subjects with grades are automatically marked as completed</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Status Selector Popup - VERTICAL */}
      {statusSelectorVisible && (
        <View 
          style={[
            styles.statusSelector,
            {
              left: statusSelectorPosition.x - 30,
              top: statusSelectorPosition.y - 80,
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.statusOption, { backgroundColor: '#4CAF5020' }]}
            onPress={() => {
              setSubjects(prev => prev.map(s => 
                s.$id === statusSelectorVisible ? { ...s, status: 'completed' as SubjectStatus } : s
              ));
              setStatusSelectorVisible(null);
            }}
          >
            <Text style={[styles.statusOptionIcon, { color: '#4CAF50' }]}>✓</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.statusOption, { backgroundColor: '#2196F320' }]}
            onPress={() => {
              setSubjects(prev => prev.map(s => 
                s.$id === statusSelectorVisible ? { ...s, status: 'ongoing' as SubjectStatus } : s
              ));
              setStatusSelectorVisible(null);
            }}
          >
            <Text style={[styles.statusOptionIcon, { color: '#2196F3' }]}>○</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.statusOption, { backgroundColor: '#9E9E9E20' }]}
            onPress={() => {
              setSubjects(prev => prev.map(s => 
                s.$id === statusSelectorVisible ? { ...s, status: 'upcoming' as SubjectStatus } : s
              ));
              setStatusSelectorVisible(null);
            }}
          >
            <Text style={[styles.statusOptionIcon, { color: '#9E9E9E' }]}>—</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grade Upload Modal */}
      <GradeUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        subjects={subjects}
        onGradesUpdated={handleGradesUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 32,
    color: '#333',
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  overallGWAContainer: {
    alignItems: 'flex-end',
  },
  overallGWAValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 4,
  },
  overallGWALabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  
  // NEW: Upload Button Container (right aligned, above tabs)
  uploadContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  uploadButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  
  // NEW: Year Tabs (4 equal columns, all visible)
  yearTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  yearTab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  yearTabActive: {
    backgroundColor: '#4ECDC4',
  },
  yearTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  yearTabTextActive: {
    color: '#fff',
  },
  
  yearGWACard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yearGWALabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
  },
  yearGWAValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  semesterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  semesterHeader: {
    backgroundColor: '#4ECDC4',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  semesterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  semesterSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  semesterGWAContainer: {
    alignItems: 'flex-end',
  },
  semesterGWAValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  semesterGWALabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // NEW: Compact Table Layout
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  
  // Column widths - OPTIMIZED
  colStatus: { width: 28, alignItems: 'center' },
  colCode: { width: 75 },
  colTitle: { flex: 1, paddingRight: 4 },
  colUnit: { width: 22, alignItems: 'center' },  // Tighter spacing
  colGrade: { width: 60, alignItems: 'center' },  // Wider for visibility
  
  subjectRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  statusBadgeContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeContainerLocked: {
    opacity: 1,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ECDC4',
    letterSpacing: 0.3,
  },
  subjectName: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    fontWeight: '500',
  },
  unitCell: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  unitCellBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  gradeInput: {
    width: 56,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 4,
  },
  gradeInputFilled: {
    borderColor: '#4ECDC4',
    backgroundColor: '#fff',
    color: '#4ECDC4',
    fontWeight: '700',
  },
  gradeInputEditing: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  gradeInputEmpty: {
    width: 56,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeEmptyText: {
    fontSize: 18,
    color: '#CCC',
    fontWeight: '300',
  },
  
  legend: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIcon: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
  },
  legendNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Status Selector Popup - VERTICAL
  statusSelector: {
    position: 'absolute',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  statusOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});