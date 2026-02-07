import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { getCurriculumByUser, type CurriculumSubject } from '@/lib/database';
import { databases, ID } from '@/lib/appwrite';

// Database constants
const DATABASE_ID = process.env.EXPO_PUBLIC_DATABASE_ID!;
const CURRICULUM_COLLECTION_ID = process.env.EXPO_PUBLIC_CURRICULUM_COLLECTION_ID!;

// Known curriculum
const KNOWN_CURRICULUM_SUBJECTS = {
  '1st Year': {
    '1st Semester': [
      { code: 'CS 101', name: 'Introduction to Computing', units: 3 },
      { code: 'CS 102', name: 'Computer Programming 1', units: 3 },
      { code: 'MATH 101', name: 'Mathematical Analysis 1', units: 3 },
      { code: 'PHYS 1', name: 'Physics for Computing', units: 3 },
      { code: 'GEC 11', name: 'Understanding the Self', units: 3 },
      { code: 'PATHFIT 1', name: 'Movement Competency Training', units: 2 },
      { code: 'NSTP 11', name: 'LTS/CWTS/ROTC', units: 3 },
    ],
    '2nd Semester': [
      { code: 'CS 103', name: 'Computer Programming 2', units: 3 },
      { code: 'CS 107', name: 'Digital System Design', units: 3 },
      { code: 'MATH 102', name: 'Mathematical Analysis 2', units: 3 },
      { code: 'GEC 12', name: 'Readings in Philippine History', units: 3 },
      { code: 'GEC 13', name: 'The Contemporary World', units: 3 },
      { code: 'PATHFIT 2', name: 'Exercise-based Fitness Activities', units: 2 },
      { code: 'NSTP 2', name: 'LTS/CWTS/ROTC', units: 3 },
    ],
  },
  '2nd Year': {
    '1st Semester': [
      { code: 'CS 104', name: 'Data Structure and Algorithm', units: 3 },
      { code: 'CS 106', name: 'Application Development', units: 3 },
      { code: 'CS 108', name: 'Object-oriented Programming', units: 3 },
      { code: 'CS 109', name: 'Discrete Structures 1', units: 3 },
      { code: 'Math Elec 101', name: 'Linear Algebra', units: 3 },
      { code: 'GEC 14', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'PATHFIT 3', name: 'Menu of Dance, Sports, Martial Arts', units: 2 },
    ],
    '2nd Semester': [
      { code: 'CS 105', name: 'Information Management', units: 3 },
      { code: 'CS 110', name: 'Discrete Structures 2', units: 3 },
      { code: 'CS 111', name: 'Design and Analysis of Algorithms', units: 3 },
      { code: 'CS 112', name: 'Programming Languages', units: 3 },
      { code: 'CS 113', name: 'Special Topics in Computing', units: 3 },
      { code: 'Math Elec 102', name: 'Differential Equations', units: 3 },
      { code: 'GEC 15', name: 'Purposive Communication', units: 3 },
      { code: 'PATHFIT 4', name: 'Menu of Dance, Sports, Martial Arts', units: 2 },
    ],
  },
  '3rd Year': {
    '1st Semester': [
      { code: 'CS 114', name: 'Operating Systems', units: 3 },
      { code: 'CS 115', name: 'Computer Architecture and Organization', units: 3 },
      { code: 'CS 116', name: 'Automata Theory and Formal Languages', units: 3 },
      { code: 'CS 117', name: 'Software Engineering 1', units: 3 },
      { code: 'CS Elec 1', name: 'CS Elective 1', units: 3 },
      { code: 'GEC 16', name: 'Art Appreciation', units: 3 },
    ],
    '2nd Semester': [
      { code: 'CS 118', name: 'Software Engineering 2', units: 3 },
      { code: 'CS 119', name: 'Networks and Communications', units: 3 },
      { code: 'CS 120', name: 'Human Computer Interaction', units: 3 },
      { code: 'CS 121', name: 'Information Assurance and Security', units: 3 },
      { code: 'CS Elec 2', name: 'CS Elective 2', units: 3 },
      { code: 'GEC 17', name: 'Science, Technology and Society', units: 3 },
      { code: 'GEC 18', name: 'Ethics', units: 3 },
    ],
  },
  '4th Year': {
    '1st Semester': [
      { code: 'CS 123', name: 'Numerical Analysis', units: 3 },
      { code: 'CS 124', name: 'CS Thesis 1', units: 3 },
      { code: 'CS Elec 3', name: 'CS Elective 3', units: 3 },
      { code: 'GEC 20', name: 'The Entrepreneurial Mind', units: 3 },
      { code: 'GEC Elec 1', name: 'Environmental Science', units: 3 },
      { code: 'GEC Elec 22', name: 'Great Books', units: 3 },
    ],
    '2nd Semester': [
      { code: 'CS 125', name: 'CS Thesis 2', units: 3 },
      { code: 'CS 126', name: 'Social Issues and Professional Practice', units: 3 },
      { code: 'GEC 19', name: 'Life and Works of Rizal', units: 3 },
      { code: 'GEC Elec 2', name: 'Living in the IT Era', units: 3 },
      { code: 'GEC Elec 21', name: 'Human Reproduction', units: 3 },
    ],
  },
};

// Validate if subject exists in curriculum
const validateAgainstCurriculum = (
  code: string,
  name: string,
  units: number,
  year: string,
  semester: string
): { isValid: boolean; message: string } => {
  // Check if units exceed 5
  if (units > 5) {
    return {
      isValid: false,
      message: 'Units cannot exceed 5. This is not a valid subject in your curriculum.'
    };
  }

  // Get subjects for the specified year and semester
  const semesterSubjects = KNOWN_CURRICULUM_SUBJECTS[year]?.[semester];
  
  if (!semesterSubjects) {
    return {
      isValid: false,
      message: 'Invalid year or semester selected.'
    };
  }

  // Check if subject code exists in the curriculum
  const subjectByCode = semesterSubjects.find(s => 
    s.code.toLowerCase() === code.toLowerCase()
  );

  // Check if subject name exists in the curriculum
  const subjectByName = semesterSubjects.find(s => 
    s.name.toLowerCase().includes(name.toLowerCase()) || 
    name.toLowerCase().includes(s.name.toLowerCase())
  );

  // If neither code nor name matches
  if (!subjectByCode && !subjectByName) {
    return {
      isValid: false,
      message: `This subject is not found in ${year} - ${semester} of your BSCS curriculum. Please verify the subject code, name, and semester.`
    };
  }

  // If code matches but in wrong semester
  const allSubjects = Object.values(KNOWN_CURRICULUM_SUBJECTS).flatMap(yearData =>
    Object.entries(yearData).flatMap(([sem, subjects]) =>
      subjects.map(s => ({ ...s, year: yearData, semester: sem }))
    )
  );

  const correctSemester = allSubjects.find(s => 
    s.code.toLowerCase() === code.toLowerCase()
  );

  if (correctSemester && 
      (correctSemester.semester !== semester || 
       Object.keys(KNOWN_CURRICULUM_SUBJECTS).find(y => 
         KNOWN_CURRICULUM_SUBJECTS[y] === correctSemester.year
       ) !== year)) {
    // Find the correct year for this subject
    let correctYear = '';
    Object.entries(KNOWN_CURRICULUM_SUBJECTS).forEach(([y, sems]) => {
      Object.values(sems).forEach(subjects => {
        if (subjects.some(s => s.code.toLowerCase() === code.toLowerCase())) {
          correctYear = y;
        }
      });
    });
    
    return {
      isValid: false,
      message: `${code} exists but should be in ${correctYear} - ${correctSemester.semester}, not ${year} - ${semester}.`
    };
  }

  // Validate units match
  if (subjectByCode && subjectByCode.units !== units) {
    return {
      isValid: false,
      message: `${code} should have ${subjectByCode.units} units, not ${units} units.`
    };
  }

  return { isValid: true, message: 'Valid subject' };
};

// 🎯 ENHANCED VALIDATION
const validateSubject = (subject: CurriculumSubject): {isValid: boolean, issues: string[]} => {
  const issues: string[] = [];

  if (subject.subjectCode === 'Subject' || subject.subjectCode.length < 2) {
    issues.push('Invalid code');
  }

  if (subject.subjectName === 'Subject' || subject.subjectName.includes('[AUTO-ADDED]') || subject.subjectName.length < 5) {
    issues.push('Generic/incomplete title');
  }

  if (subject.subjectName.match(/\)|Cormputing|Hurman|Cormmunications|Readingsin|Moverment|Anaysis|Appreciatier|Pagpapatalaga|Lipunan|CSThesis/i)) {
    issues.push('OCR typos in title');
  }

  if (subject.subjectName.length < 10 && !subject.subjectCode.includes('Elec') && subject.subjectName !== 'Ethics') {
    issues.push('Title too short');
  }

  if (subject.subjectName.includes('...')) {
    issues.push('Title truncated');
  }

  if (subject.lecUnits! > 5 || subject.labUnits! > 5) {
    issues.push('Unusual units');
  }

  if (subject.units !== subject.lecUnits! + subject.labUnits!) {
    issues.push('Unit calculation error');
  }

  if (subject.units === 0) {
    issues.push('Zero units');
  }

  if (subject.units > 5) {
    issues.push('Total units exceed 5');
  }

  if (subject.subjectCode.includes('PATHEIT')) {
    issues.push('Should be PATHFIT');
  }

  return { isValid: issues.length === 0, issues };
};

export default function CurriculumVerifyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [editingSubject, setEditingSubject] = useState<CurriculumSubject | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Add subject modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subjectCode: '',
    subjectName: '',
    lecUnits: 0,
    labUnits: 0,
    yearLevel: '1st Year',
    semester: '1st Semester',
  });

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [user?.$id])
  );

  const loadSubjects = async () => {
    if (!user?.$id) return;

    try {
      const curriculumSubjects = await getCurriculumByUser(user.$id);
      setSubjects(curriculumSubjects);

      const yearsWithSubjects = new Set(curriculumSubjects.map(s => s.yearLevel));
      setExpandedYears(yearsWithSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  // Update subject in database
  const updateSubject = async (subjectId: string, updates: Partial<CurriculumSubject>) => {
    try {
      console.log('Updating subject:', subjectId, updates);

      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanUpdates[key] = value;
        }
      });

      await databases.updateDocument(
        DATABASE_ID,
        CURRICULUM_COLLECTION_ID,
        subjectId,
        cleanUpdates
      );

      setSubjects(prev => prev.map(s =>
        s.$id === subjectId ? { ...s, ...cleanUpdates } : s
      ));

      Alert.alert('Success', 'Subject updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating subject:', error);
      Alert.alert('Error', `Failed to update subject: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Delete subject
  const deleteSubject = async (subjectId: string) => {
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                CURRICULUM_COLLECTION_ID,
                subjectId
              );

              setSubjects(prev => prev.filter(s => s.$id !== subjectId));
              Alert.alert('Success', 'Subject deleted');
            } catch (error) {
              console.error('Error deleting subject:', error);
              Alert.alert('Error', 'Failed to delete subject');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (subject: CurriculumSubject) => {
    setEditingSubject({ ...subject });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSubject || !editingSubject.$id) {
      Alert.alert('Error', 'No subject selected');
      return;
    }

    if (!editingSubject.subjectCode || editingSubject.subjectCode.trim().length < 2) {
      Alert.alert('Validation Error', 'Subject code must be at least 2 characters');
      return;
    }

    if (!editingSubject.subjectName || editingSubject.subjectName.trim().length < 3) {
      Alert.alert('Validation Error', 'Subject name must be at least 3 characters');
      return;
    }

    const lecUnits = editingSubject.lecUnits || 0;
    const labUnits = editingSubject.labUnits || 0;
    const totalUnits = lecUnits + labUnits;

    if (totalUnits === 0) {
      Alert.alert('Validation Error', 'Total units must be greater than 0');
      return;
    }

    // Validate against curriculum
    const validation = validateAgainstCurriculum(
      editingSubject.subjectCode.trim(),
      editingSubject.subjectName.trim(),
      totalUnits,
      editingSubject.yearLevel,
      editingSubject.semester
    );

    if (!validation.isValid) {
      Alert.alert('Not in Curriculum', validation.message);
      return;
    }

    const updates = {
      subjectCode: editingSubject.subjectCode.trim(),
      subjectName: editingSubject.subjectName.trim(),
      lecUnits: lecUnits,
      labUnits: labUnits,
      units: totalUnits,
    };

    const success = await updateSubject(editingSubject.$id, updates);

    if (success) {
      setEditModalVisible(false);
      setEditingSubject(null);
    }
  };

  const handleAddSubject = () => {
    setNewSubject({
      subjectCode: '',
      subjectName: '',
      lecUnits: 0,
      labUnits: 0,
      yearLevel: '1st Year',
      semester: '1st Semester',
    });
    setAddModalVisible(true);
  };

  const handleSaveNewSubject = async () => {
    if (!user?.$id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!newSubject.subjectCode || newSubject.subjectCode.trim().length < 2) {
      Alert.alert('Validation Error', 'Subject code must be at least 2 characters');
      return;
    }

    if (!newSubject.subjectName || newSubject.subjectName.trim().length < 3) {
      Alert.alert('Validation Error', 'Subject name must be at least 3 characters');
      return;
    }

    const totalUnits = newSubject.lecUnits + newSubject.labUnits;
    if (totalUnits === 0) {
      Alert.alert('Validation Error', 'Total units must be greater than 0');
      return;
    }

    // 🚨 VALIDATE AGAINST CURRICULUM
    const validation = validateAgainstCurriculum(
      newSubject.subjectCode.trim(),
      newSubject.subjectName.trim(),
      totalUnits,
      newSubject.yearLevel,
      newSubject.semester
    );

    if (!validation.isValid) {
      Alert.alert('Not in Curriculum', validation.message);
      return;
    }

    try {
      const created = await databases.createDocument(
        DATABASE_ID,
        CURRICULUM_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          subjectCode: newSubject.subjectCode.trim(),
          subjectName: newSubject.subjectName.trim(),
          units: totalUnits,
          lecUnits: newSubject.lecUnits,
          labUnits: newSubject.labUnits,
          yearLevel: newSubject.yearLevel,
          semester: newSubject.semester,
          status: 'upcoming',
          grade: null,
          instructor: null,
        }
      );

      setSubjects(prev => [...prev, created as CurriculumSubject]);

      Alert.alert('Success', 'Subject added successfully!');
      setAddModalVisible(false);
    } catch (error: any) {
      console.error('Error adding subject:', error);
      Alert.alert('Error', `Failed to add subject: ${error.message || 'Unknown error'}`);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    let totalErrors = 0;
    let totalExpected = 0;
    let totalExtracted = subjects.length;
    let perfectSubjects = 0;

    const errorSubjects: CurriculumSubject[] = [];
    const missingSubjects: Array<{code: string, name: string, year: string, semester: string}> = [];

    subjects.forEach(subject => {
      const validation = validateSubject(subject);
      if (!validation.isValid) {
        totalErrors++;
        errorSubjects.push(subject);
      } else {
        perfectSubjects++;
      }
    });

    const extractedCodes = new Set(subjects.map(s => s.subjectCode));

    Object.entries(KNOWN_CURRICULUM_SUBJECTS).forEach(([year, semesters]) => {
      Object.entries(semesters).forEach(([semester, expectedSubjects]) => {
        const hasSubjectsInSemester = subjects.some(
          s => s.yearLevel === year && s.semester === semester
        );

        if (hasSubjectsInSemester) {
          expectedSubjects.forEach(expected => {
            totalExpected++;
            if (!extractedCodes.has(expected.code)) {
              missingSubjects.push({
                code: expected.code,
                name: expected.name,
                year: year,
                semester: semester
              });
            }
          });
        }
      });
    });

    const accuracy = totalExpected > 0 ? Math.round((perfectSubjects / totalExpected) * 100) : 0;

    return {
      accuracy,
      totalErrors,
      totalExtracted,
      totalExpected,
      perfectSubjects,
      missingCount: missingSubjects.length,
      missingSubjects,
      errorSubjects,
    };
  };

  const stats = calculateStats();

  const groupedSubjects = subjects.reduce((acc, subject) => {
    const yearKey = subject.yearLevel;
    const semesterKey = subject.semester;

    if (!acc[yearKey]) {
      acc[yearKey] = {};
    }
    if (!acc[yearKey][semesterKey]) {
      acc[yearKey][semesterKey] = [];
    }

    acc[yearKey][semesterKey].push(subject);
    return acc;
  }, {} as Record<string, Record<string, CurriculumSubject[]>>);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const handleScanAnother = () => {
    router.push('/curriculum-setup');
  };

  const handleDone = () => {
    if (stats.totalErrors > 0 || stats.missingCount > 0) {
      Alert.alert(
        'Confirm Save',
        `There are ${stats.totalErrors} subjects with issues and ${stats.missingCount} missing subjects. Save anyway?`,
        [
          { text: 'Review', style: 'cancel' },
          { text: 'Save', onPress: () => router.replace('/(tabs)/profile') },
        ]
      );
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  if (subjects.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Verify Curriculum</Text>
            <Text style={styles.headerSubtitle}>Step 2 of 2</Text>
          </View>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No subjects found</Text>
          <Text style={styles.emptySubtext}>Please scan your curriculum first</Text>
          <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/curriculum-setup')}>
            <Text style={styles.scanButtonText}>Scan Curriculum</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getStatusColor = () => {
    if (stats.accuracy >= 95) return '#E8F5E9';
    if (stats.accuracy >= 85) return '#FFF9C4';
    return '#FFEBEE';
  };

  const getStatusBorderColor = () => {
    if (stats.accuracy >= 95) return '#81C784';
    if (stats.accuracy >= 85) return '#F57C00';
    return '#EF5350';
  };

  const getStatusIcon = () => {
    if (stats.accuracy >= 95) return '✓';
    if (stats.accuracy >= 85) return '⚠️';
    return '❌';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Verify Curriculum</Text>
          <Text style={styles.headerSubtitle}>Step 2 of 2 • {subjects.length} subjects</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Report Card */}
        <View style={[styles.reportCard, {
          backgroundColor: getStatusColor(),
          borderColor: getStatusBorderColor()
        }]}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportIcon}>{getStatusIcon()}</Text>
            <Text style={styles.reportTitle}>Extraction Report</Text>
          </View>

          <View style={styles.reportStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy:</Text>
              <Text style={[styles.statValue, styles.statBold]}>{stats.accuracy}%</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Extracted:</Text>
              <Text style={styles.statValue}>{stats.totalExtracted} / {stats.totalExpected} subjects</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Perfect:</Text>
              <Text style={[styles.statValue, styles.statSuccess]}>{stats.perfectSubjects} subjects</Text>
            </View>
            {stats.totalErrors > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Need Review:</Text>
                <Text style={[styles.statValue, styles.statError]}>{stats.totalErrors} subjects</Text>
              </View>
            )}
            {stats.missingCount > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Missing:</Text>
                <Text style={[styles.statValue, styles.statError]}>{stats.missingCount} subjects</Text>
              </View>
            )}
          </View>

          {(stats.missingCount > 0 || stats.totalErrors > 0) && (
            <View style={styles.reportWarning}>
              <Text style={styles.reportWarningText}>
                ⚠️ {stats.totalErrors > 0 ? 'Tap subjects below to edit. ' : ''}
                {stats.missingCount > 0 ? `${stats.missingCount} subjects are missing.` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Missing subjects */}
        {stats.missingSubjects.length > 0 && (
          <View style={styles.missingCard}>
            <Text style={styles.missingTitle}>📋 Missing Subjects ({stats.missingCount}):</Text>
            {stats.missingSubjects.map((missing, index) => (
              <Text key={index} style={styles.missingText}>
                • {missing.code} - {missing.name}
                {'\n'}  📍 Should be in: {missing.year}, {missing.semester}
              </Text>
            ))}
            <Text style={styles.missingHint}>💡 Use "Add Missing Subject" button below</Text>
          </View>
        )}

        {/* ADD SUBJECT BUTTON */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddSubject}>
          <Text style={styles.addButtonText}>➕ Add Missing Subject</Text>
        </TouchableOpacity>

        {/* Subject tables */}
        {Object.keys(groupedSubjects)
          .sort((a, b) => {
            const order = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(year => (
            <View key={year} style={styles.yearSection}>
              <TouchableOpacity style={styles.yearHeader} onPress={() => toggleYear(year)}>
                <Text style={styles.yearTitle}>{year}</Text>
                <Text style={styles.yearArrow}>{expandedYears.has(year) ? '▼' : '▶'}</Text>
              </TouchableOpacity>

              {expandedYears.has(year) && Object.keys(groupedSubjects[year])
                .sort()
                .map(semester => (
                  <View key={semester} style={styles.semesterSection}>
                    <Text style={styles.semesterTitle}>{semester}</Text>

                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.codeColumn]}>CODE</Text>
                      <Text style={[styles.tableHeaderText, styles.titleColumn]}>TITLE</Text>
                      <Text style={[styles.tableHeaderText, styles.unitColumn]}>LEC</Text>
                      <Text style={[styles.tableHeaderText, styles.unitColumn]}>LAB</Text>
                      <Text style={[styles.tableHeaderText, styles.unitColumn]}>TOTAL</Text>
                      <Text style={[styles.tableHeaderText, styles.editButton]}>EDIT</Text>
                    </View>

                    {groupedSubjects[year][semester].map((subject, index) => {
                      const validation = validateSubject(subject);
                      const hasError = !validation.isValid;

                      return (
                        <View key={index} style={[styles.tableRow, hasError && styles.tableRowError]}>
                          <Text style={[styles.tableCell, styles.codeColumn, styles.codeText]}>
                            {subject.subjectCode}
                          </Text>
                          <View style={styles.titleColumn}>
                            <Text style={[styles.tableCell, styles.titleText]}>
                              {subject.subjectName}
                            </Text>
                            {hasError && (
                              <Text style={styles.errorText}>
                                ⚠️ {validation.issues.join(', ')}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.tableCell, styles.unitColumn, styles.centerText]}>
                            {subject.lecUnits}
                          </Text>
                          <Text style={[styles.tableCell, styles.unitColumn, styles.centerText]}>
                            {subject.labUnits}
                          </Text>
                          <Text style={[styles.tableCell, styles.unitColumn, styles.centerText, styles.boldText]}>
                            {subject.units}
                          </Text>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEdit(subject)}
                          >
                            <Text style={styles.editButtonText}>✏️</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))}
            </View>
          ))}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.scanAnotherButton} onPress={handleScanAnother}>
            <Text style={styles.scanAnotherButtonText}>📷 Scan Another Page</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>✓ Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Subject</Text>

            <Text style={styles.inputLabel}>Subject Code</Text>
            <TextInput
              style={styles.input}
              value={editingSubject?.subjectCode}
              onChangeText={(text) => setEditingSubject(prev => prev ? {...prev, subjectCode: text} : null)}
              placeholder="e.g., CS 101"
            />

            <Text style={styles.inputLabel}>Subject Name</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editingSubject?.subjectName}
              onChangeText={(text) => setEditingSubject(prev => prev ? {...prev, subjectName: text} : null)}
              placeholder="e.g., Computer Programming 1"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>Units</Text>
            <View style={styles.unitsRow}>
              <View style={styles.unitInput}>
                <Text style={styles.unitInputLabel}>Lec Units</Text>
                <TextInput
                  style={styles.input}
                  value={editingSubject?.lecUnits?.toString()}
                  onChangeText={(text) => setEditingSubject(prev => prev ? {...prev, lecUnits: parseInt(text) || 0} : null)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.unitInput}>
                <Text style={styles.unitInputLabel}>Lab Units</Text>
                <TextInput
                  style={styles.input}
                  value={editingSubject?.labUnits?.toString()}
                  onChangeText={(text) => setEditingSubject(prev => prev ? {...prev, labUnits: parseInt(text) || 0} : null)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.unitInput}>
                <Text style={styles.unitInputLabel}>Total</Text>
                <Text style={styles.totalUnits}>
                  {(editingSubject?.lecUnits || 0) + (editingSubject?.labUnits || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => {
                  setEditModalVisible(false);
                  if (editingSubject?.$id) {
                    deleteSubject(editingSubject.$id);
                  }
                }}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>✓ Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD SUBJECT MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Subject</Text>
              <Text style={styles.modalSubtitle}>Subject will be validated against BSCS curriculum</Text>

              {/* Year Level - MOVED TO TOP */}
              <Text style={styles.inputLabel}>Year Level *</Text>
              <View style={styles.pickerRow}>
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerOption,
                      newSubject.yearLevel === year && styles.pickerOptionActive
                    ]}
                    onPress={() => setNewSubject(prev => ({...prev, yearLevel: year}))}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      newSubject.yearLevel === year && styles.pickerOptionTextActive
                    ]}>
                      {year.replace(' Year', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Semester - MOVED TO TOP */}
              <Text style={styles.inputLabel}>Semester *</Text>
              <View style={styles.pickerRow}>
                {['1st Semester', '2nd Semester'].map(sem => (
                  <TouchableOpacity
                    key={sem}
                    style={[
                      styles.pickerOption,
                      newSubject.semester === sem && styles.pickerOptionActive
                    ]}
                    onPress={() => setNewSubject(prev => ({...prev, semester: sem}))}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      newSubject.semester === sem && styles.pickerOptionTextActive
                    ]}>
                      {sem.replace(' Semester', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject Code */}
              <Text style={styles.inputLabel}>Subject Code *</Text>
              <TextInput
                style={styles.input}
                value={newSubject.subjectCode}
                onChangeText={(text) => setNewSubject(prev => ({...prev, subjectCode: text}))}
                placeholder="e.g., CS 101"
                autoCapitalize="characters"
              />

              {/* Subject Name */}
              <Text style={styles.inputLabel}>Subject Name *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newSubject.subjectName}
                onChangeText={(text) => setNewSubject(prev => ({...prev, subjectName: text}))}
                placeholder="e.g., Computer Programming 1"
                multiline
                numberOfLines={2}
              />

              {/* Units */}
              <Text style={styles.inputLabel}>Units * (Max: 5)</Text>
              <View style={styles.unitsRow}>
                <View style={styles.unitInput}>
                  <Text style={styles.unitInputLabel}>Lec</Text>
                  <TextInput
                    style={styles.input}
                    value={newSubject.lecUnits.toString()}
                    onChangeText={(text) => setNewSubject(prev => ({
                      ...prev,
                      lecUnits: parseInt(text) || 0
                    }))}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
                <View style={styles.unitInput}>
                  <Text style={styles.unitInputLabel}>Lab</Text>
                  <TextInput
                    style={styles.input}
                    value={newSubject.labUnits.toString()}
                    onChangeText={(text) => setNewSubject(prev => ({
                      ...prev,
                      labUnits: parseInt(text) || 0
                    }))}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
                <View style={styles.unitInput}>
                  <Text style={styles.unitInputLabel}>Total</Text>
                  <Text style={[
                    styles.totalUnits,
                    (newSubject.lecUnits + newSubject.labUnits) > 5 && styles.totalUnitsError
                  ]}>
                    {newSubject.lecUnits + newSubject.labUnits}
                  </Text>
                </View>
              </View>

              {(newSubject.lecUnits + newSubject.labUnits) > 5 && (
                <Text style={styles.errorHint}>⚠️ Total units cannot exceed 5</Text>
              )}

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveNewSubject}
                >
                  <Text style={styles.saveButtonText}>✓ Add Subject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backButtonText: { fontSize: 32, color: '#333', fontWeight: '300' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 20 },
  
  reportCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 2
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reportIcon: { fontSize: 24, marginRight: 8 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reportStats: { marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  statValue: { fontSize: 14, color: '#333' },
  statBold: { fontWeight: 'bold', fontSize: 16 },
  statSuccess: { color: '#4CAF50', fontWeight: '600' },
  statError: { color: '#D32F2F', fontWeight: '600' },
  reportWarning: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  reportWarningText: { fontSize: 13, color: '#666', lineHeight: 18 },
  
  missingCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  missingTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  missingText: { fontSize: 13, color: '#666', marginBottom: 4, lineHeight: 20 },
  missingHint: { fontSize: 12, color: '#F57C00', marginTop: 8, fontStyle: 'italic' },
  
  addButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  yearSection: { marginBottom: 20 },
  yearHeader: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yearTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  yearArrow: { fontSize: 16, color: '#fff' },
  
  semesterSection: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  semesterTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
    marginBottom: 8
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase'
  },
  
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  tableRowError: {
    backgroundColor: '#FFF9C4',
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
    paddingLeft: 8,
    borderRadius: 4,
    marginBottom: 4
  },
  
  tableCell: { fontSize: 14, color: '#333' },
  codeColumn: { width: '18%' },
  titleColumn: { width: '35%', paddingRight: 8 },
  unitColumn: { width: '12%' },
  codeText: { fontWeight: '600', color: '#4ECDC4' },
  titleText: { color: '#333', lineHeight: 18 },
  centerText: { textAlign: 'center' },
  boldText: { fontWeight: 'bold' },
  errorText: { fontSize: 11, color: '#F57C00', marginTop: 4, fontStyle: 'italic' },
  
  editButton: {
    width: '11%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: { fontSize: 18 },
  
  actionButtons: { marginTop: 24, gap: 12 },
  scanAnotherButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  scanAnotherButtonText: { fontSize: 16, fontWeight: '600', color: '#4ECDC4' },
  doneButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  bottomSpacer: { height: 40 },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666', marginBottom: 24 },
  scanButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32
  },
  scanButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  unitInput: { flex: 1 },
  unitInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  totalUnits: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4',
    textAlign: 'center',
    backgroundColor: '#F5F5F5',
  },
  totalUnitsError: {
    color: '#D32F2F',
    borderColor: '#EF5350',
    backgroundColor: '#FFEBEE',
  },
  errorHint: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  pickerOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  pickerOptionTextActive: {
    color: '#fff',
  },
  
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: { backgroundColor: '#F5F5F5' },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: { backgroundColor: '#4ECDC4' },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});