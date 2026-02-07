import { useAuth } from "@/lib/auth-context";
import { getCurriculumByUser, type CurriculumSubject } from "@/lib/database";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CurriculumVerifyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    new Set(["1st Year"]),
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] =
    useState<CurriculumSubject | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    if (!user?.$id) return;

    try {
      setLoading(true);
      const curriculumSubjects = await getCurriculumByUser(user.$id);
      setSubjects(curriculumSubjects);
    } catch (error) {
      console.error("Error loading subjects:", error);
      Alert.alert("Error", "Failed to load curriculum subjects");
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const handleEditSubject = (subject: CurriculumSubject) => {
    setEditingSubject({ ...subject });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingSubject) return;

    // Recalculate total units
    const lecUnits = editingSubject.lecUnits || 0;
    const labUnits = editingSubject.labUnits || 0;
    const totalUnits = lecUnits + labUnits;

    const updatedSubject = {
      ...editingSubject,
      units: totalUnits,
    };

    setSubjects((prev) =>
      prev.map((s) => (s.$id === updatedSubject.$id ? updatedSubject : s)),
    );

    setEditModalVisible(false);
    setEditingSubject(null);
  };

  const handleScanAnother = () => {
    Alert.alert(
      "Scan Another Page",
      "Upload another page of your curriculum?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Scan",
          onPress: () => router.push("/curriculum-setup"),
        },
      ],
    );
  };

  const handleSave = () => {
    Alert.alert(
      "Save Curriculum",
      `Save ${subjects.length} subjects to your curriculum?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            Alert.alert("Success!", "Curriculum saved successfully!", [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)/profile"),
              },
            ]);
          },
        },
      ],
    );
  };

  const groupSubjectsByYear = () => {
    const grouped: Record<string, Record<string, CurriculumSubject[]>> = {
      "1st Year": { "1st Semester": [], "2nd Semester": [] },
      "2nd Year": { "1st Semester": [], "2nd Semester": [] },
      "3rd Year": { "1st Semester": [], "2nd Semester": [], Summer: [] },
      "4th Year": { "1st Semester": [], "2nd Semester": [] },
    };

    subjects.forEach((subject) => {
      if (grouped[subject.yearLevel]) {
        if (!grouped[subject.yearLevel][subject.semester]) {
          grouped[subject.yearLevel][subject.semester] = [];
        }
        grouped[subject.yearLevel][subject.semester].push(subject);
      }
    });

    return grouped;
  };

  const calculateStats = () => {
    const totalSubjects = subjects.length;
    const totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);
    const completedSubjects = subjects.filter(
      (s) => s.status === "completed",
    ).length;
    const completionRate =
      totalSubjects > 0
        ? Math.round((completedSubjects / totalSubjects) * 100)
        : 0;

    return { totalSubjects, totalUnits, completionRate, completedSubjects };
  };

  const calculateSemesterTotals = (semesterSubjects: CurriculumSubject[]) => {
    const lecTotal = semesterSubjects.reduce(
      (sum, s) => sum + (s.lecUnits || 0),
      0,
    );
    const labTotal = semesterSubjects.reduce(
      (sum, s) => sum + (s.labUnits || 0),
      0,
    );
    const unitsTotal = semesterSubjects.reduce((sum, s) => sum + s.units, 0);
    return { lecTotal, labTotal, unitsTotal };
  };

  const groupedSubjects = groupSubjectsByYear();
  const stats = calculateStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading curriculum...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Curriculum</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>BSCS CURRICULUM</Text>
              <Text style={styles.infoValue}>BU Polangui Campus</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalSubjects}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalUnits}</Text>
                <Text style={styles.statLabel}>Units</Text>
              </View>
            </View>
          </View>

          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Completion Rate</Text>
              <Text style={styles.completionPercent}>
                {stats.completionRate}%
              </Text>
            </View>
            <Text style={styles.completionSubtext}>
              {stats.completedSubjects} of {stats.totalSubjects} subjects graded
            </Text>
          </View>
        </View>

        {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(
          (year, yearIndex) => {
            const semesters = groupedSubjects[year] || {};
            const isExpanded = expandedYears.has(year);
            const yearSubjects = Object.values(semesters).flat();

            return (
              <View key={year} style={styles.yearSection}>
                <TouchableOpacity
                  style={styles.yearHeader}
                  onPress={() => toggleYear(year)}
                >
                  <View style={styles.yearLeft}>
                    <View style={styles.yearBadge}>
                      <Text style={styles.yearBadgeText}>{yearIndex + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.yearTitle}>{year}</Text>
                      <Text style={styles.yearSubtitle}>
                        {yearSubjects.length > 0
                          ? `${Object.keys(semesters).filter((k) => semesters[k].length > 0).length} semesters • ${yearSubjects.length} subjects`
                          : "No subjects"}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.expandIcon,
                      isExpanded && styles.expandIconRotated,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>

                {isExpanded && yearSubjects.length > 0 && (
                  <View style={styles.semestersContainer}>
                    {Object.entries(semesters).map(
                      ([semester, semesterSubjects]) => {
                        if (semesterSubjects.length === 0) return null;

                        const { lecTotal, labTotal, unitsTotal } =
                          calculateSemesterTotals(semesterSubjects);

                        return (
                          <View key={semester} style={styles.semesterSection}>
                            <View style={styles.semesterHeader}>
                              <Text style={styles.semesterTitle}>
                                {semester}
                              </Text>
                              <View style={styles.semesterRight}>
                                <Text style={styles.semesterUnits}>
                                  {unitsTotal} units
                                </Text>
                                <TouchableOpacity>
                                  <Text style={styles.addGradesButton}>
                                    + Add Grades
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Table Header */}
                            <View style={styles.tableContainer}>
                              <View style={styles.tableHeader}>
                                <View style={styles.headerCell1}>
                                  <Text style={styles.tableHeaderText}>
                                    Course No.
                                  </Text>
                                </View>
                                <View style={styles.headerCell2}>
                                  <Text style={styles.tableHeaderText}>
                                    Descriptive Title
                                  </Text>
                                </View>
                                <View style={styles.headerCell3}>
                                  <Text style={styles.tableHeaderTextCenter}>
                                    Lec{"\n"}Units
                                  </Text>
                                </View>
                                <View style={styles.headerCell4}>
                                  <Text style={styles.tableHeaderTextCenter}>
                                    Lab{"\n"}Units
                                  </Text>
                                </View>
                                <View style={styles.headerCell5}>
                                  <Text style={styles.tableHeaderTextCenter}>
                                    Units
                                  </Text>
                                </View>
                                <View style={styles.headerCell6}>
                                  <Text style={styles.tableHeaderTextCenter}>
                                    Grade
                                  </Text>
                                </View>
                                <View style={styles.headerCell7}>
                                  <Text style={styles.tableHeaderTextCenter}>
                                    Rem.{"\n"}Rating
                                  </Text>
                                </View>
                              </View>

                              {/* Subject Rows */}
                              {semesterSubjects.map((subject, index) => (
                                <TouchableOpacity
                                  key={subject.$id}
                                  style={[
                                    styles.tableRow,
                                    index === semesterSubjects.length - 1 &&
                                      styles.tableRowLast,
                                  ]}
                                  onPress={() => handleEditSubject(subject)}
                                >
                                  <View style={styles.cell1}>
                                    <Text style={styles.cellTextCode}>
                                      {subject.subjectCode}
                                    </Text>
                                  </View>
                                  <View style={styles.cell2}>
                                    <Text
                                      style={styles.cellTextTitle}
                                      numberOfLines={2}
                                    >
                                      {subject.subjectName}
                                    </Text>
                                  </View>
                                  <View style={styles.cell3}>
                                    <Text style={styles.cellTextCenter}>
                                      {subject.lecUnits || 0}
                                    </Text>
                                  </View>
                                  <View style={styles.cell4}>
                                    <Text style={styles.cellTextCenter}>
                                      {subject.labUnits || 0}
                                    </Text>
                                  </View>
                                  <View style={styles.cell5}>
                                    <Text style={styles.cellTextCenter}>
                                      {subject.units}
                                    </Text>
                                  </View>
                                  <View style={styles.cell6}>
                                    <Text style={styles.cellTextCenter}>
                                      {subject.grade || ""}
                                    </Text>
                                  </View>
                                  <View style={styles.cell7}>
                                    <Text style={styles.cellTextCenter}></Text>
                                  </View>
                                </TouchableOpacity>
                              ))}

                              {/* Semester Total Row */}
                              <View style={styles.totalRow}>
                                <View style={styles.totalCell1}>
                                  <Text style={styles.totalText}>Total</Text>
                                </View>
                                <View style={styles.totalCell2} />
                                <View style={styles.totalCell3}>
                                  <Text style={styles.totalValueText}>
                                    {lecTotal}
                                  </Text>
                                </View>
                                <View style={styles.totalCell4}>
                                  <Text style={styles.totalValueText}>
                                    {labTotal}
                                  </Text>
                                </View>
                                <View style={styles.totalCell5}>
                                  <Text style={styles.totalValueText}>
                                    {unitsTotal}
                                  </Text>
                                </View>
                                <View style={styles.totalCell6} />
                                <View style={styles.totalCell7} />
                              </View>
                            </View>
                          </View>
                        );
                      },
                    )}
                  </View>
                )}
              </View>
            );
          },
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanAnother}
          >
            <Text style={styles.scanButtonText}>📷 Scan Another Page</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>✓ Save Curriculum</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Subject</Text>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Course No.</Text>
              <TextInput
                style={styles.editInput}
                value={editingSubject?.subjectCode}
                onChangeText={(text) =>
                  setEditingSubject((prev) =>
                    prev ? { ...prev, subjectCode: text } : null,
                  )
                }
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Descriptive Title</Text>
              <TextInput
                style={[styles.editInput, { height: 60 }]}
                value={editingSubject?.subjectName}
                onChangeText={(text) =>
                  setEditingSubject((prev) =>
                    prev ? { ...prev, subjectName: text } : null,
                  )
                }
                multiline
              />
            </View>

            <View style={styles.editFieldRow}>
              <View style={[styles.editField, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.editLabel}>Lec Units</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingSubject?.lecUnits?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingSubject((prev) =>
                      prev ? { ...prev, lecUnits: parseInt(text) || 0 } : null,
                    )
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>Lab Units</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingSubject?.labUnits?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingSubject((prev) =>
                      prev ? { ...prev, labUnits: parseInt(text) || 0 } : null,
                    )
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Grade (Optional)</Text>
              <TextInput
                style={styles.editInput}
                value={editingSubject?.grade || ""}
                onChangeText={(text) =>
                  setEditingSubject((prev) =>
                    prev ? { ...prev, grade: text } : null,
                  )
                }
                placeholder="1.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: "#333",
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  topSection: {
    backgroundColor: "#fff",
    borderBottomWidth: 8,
    borderBottomColor: "#f0f0f0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    gap: 30,
  },
  statItem: {
    alignItems: "flex-end",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
  },
  completionSection: {
    padding: 20,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  completionPercent: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4ECDC4",
  },
  completionSubtext: {
    fontSize: 12,
    color: "#999",
  },
  yearSection: {
    marginBottom: 1,
  },
  yearHeader: {
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  yearBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  yearBadgeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  yearTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  yearSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  expandIcon: {
    fontSize: 24,
    color: "#ccc",
  },
  expandIconRotated: {
    transform: [{ rotate: "90deg" }],
  },
  semestersContainer: {
    backgroundColor: "#fff",
  },
  semesterSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  semesterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FAFAFA",
  },
  semesterTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  semesterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  semesterUnits: {
    fontSize: 12,
    color: "#999",
  },
  addGradesButton: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4ECDC4",
  },
  tableContainer: {
    paddingHorizontal: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E8E8E8",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCC",
    minHeight: 40,
  },
  tableRowLast: {
    // borderBottomWidth: 1,
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#CCC",
    borderTopWidth: 2,
  },
  headerCell1: {
    width: 70,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell2: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell3: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell4: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell5: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell6: {
    width: 50,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  headerCell7: {
    width: 50,
    padding: 8,
    justifyContent: "center",
  },
  cell1: {
    width: 70,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell2: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell3: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell4: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell5: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell6: {
    width: 50,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  cell7: {
    width: 50,
    padding: 8,
    justifyContent: "center",
  },
  totalCell1: {
    width: 70,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  totalCell2: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
  },
  totalCell3: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  totalCell4: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  totalCell5: {
    width: 45,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
  },
  totalCell6: {
    width: 50,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
  },
  totalCell7: {
    width: 50,
    padding: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  tableHeaderTextCenter: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  cellTextCode: {
    fontSize: 11,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  cellTextTitle: {
    fontSize: 10,
    color: "#333",
    lineHeight: 14,
  },
  cellTextCenter: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
  totalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  totalValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4ECDC4",
    textAlign: "center",
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  scanButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4ECDC4",
  },
  saveButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  editField: {
    marginBottom: 15,
  },
  editFieldRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
});
