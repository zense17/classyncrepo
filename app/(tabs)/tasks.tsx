import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

// --- CONFIGURATION ---

// 1. Priority Scoring for Sorting (Higher number = Higher priority)
const PRIORITY_SCORE = {
  'Critical': 4,
  'High': 3,
  'Medium': 2,
  'Low': 1
};

// 2. Dummy Data (Expanded to show all colors)
const TASKS = [
  {
    id: '0',
    title: 'Thesis Final Defense',
    priority: 'Critical', // Red
    time: '2 hours',
    dueDate: 'Tomorrow',
    course: 'THESIS 2',
    difficulty: 'hard',
  },
  {
    id: '1',
    title: 'CS 101 - Programming Assignment',
    priority: 'High', // Light Red
    time: '3 hours',
    dueDate: 'Nov 24, 2025',
    course: 'CS 101',
    difficulty: 'hard',
  },
  {
    id: '2',
    title: 'MATH 21 - Problem Set 5',
    priority: 'High', // Light Red
    time: '3 hours',
    dueDate: 'Nov 24, 2025',
    course: 'MATH 21',
    difficulty: 'hard',
  },
  {
    id: '3',
    title: 'GEC 16 - Artists and Artisans',
    priority: 'Medium', // Yellow
    time: '1 hour',
    dueDate: 'Nov 27, 2025',
    course: 'GEC 16',
    difficulty: 'medium',
  },
  {
    id: '4',
    title: 'PE 101 - Weekly Reflection',
    priority: 'Low', // Green
    time: '30 mins',
    dueDate: 'Nov 28, 2025',
    course: 'PE 101',
    difficulty: 'easy',
  },
];

const FILTERS = ['All Tasks', 'Critical', 'High', 'Medium', 'Low'];

export default function SmartTasksScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All Tasks');

  // --- LOGIC ---

  // 1. Helper to get colors based on priority
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'Critical': // Red
        return {
          cardBg: '#FFEBEE', // Very light red background
          accent: '#D32F2F', // Strong red dot
          tagBg: '#FFCDD2',  // Light red tag
          tagText: '#B71C1C' // Dark red text
        };
      case 'High': // Light Red (Salmon/Pinkish)
        return {
          cardBg: '#FFF2F2', // Extremely light red/pink
          accent: '#EF5350', // Softer red dot
          tagBg: '#FFEBEE',
          tagText: '#C62828'
        };
      case 'Medium': // Yellow
        return {
          cardBg: '#FFFDE7', // Light yellow background
          accent: '#FBC02D', // Strong yellow/orange dot
          tagBg: '#FFF9C4',
          tagText: '#F57F17'
        };
      case 'Low': // Green
        return {
          cardBg: '#E8F5E9', // Light green background
          accent: '#43A047', // Green dot
          tagBg: '#C8E6C9',
          tagText: '#1B5E20'
        };
      default:
        return {
          cardBg: '#FFFFFF',
          accent: '#9E9E9E',
          tagBg: '#F5F5F5',
          tagText: '#616161'
        };
    }
  };

  // 2. Sorting & Filtering
  // useMemo ensures we only re-sort/re-filter when data or filter changes
  const processedTasks = useMemo(() => {
    // A. Filter first
    let filtered = TASKS;
    if (activeFilter !== 'All Tasks') {
      filtered = TASKS.filter(t => t.priority === activeFilter);
    }

    // B. Sort based on PRIORITY_SCORE (Critical -> Low)
    return [...filtered].sort((a, b) => {
      const scoreA = PRIORITY_SCORE[a.priority] || 0;
      const scoreB = PRIORITY_SCORE[b.priority] || 0;
      return scoreB - scoreA; // Descending
    });
  }, [activeFilter]);


  // --- RENDER ---

  const renderTaskCard = ({ item }) => {
    const stylesConfig = getPriorityStyles(item.priority);

    return (
      <View style={[styles.card, { backgroundColor: stylesConfig.cardBg }]}>
        {/* Top Row: Priority Badge + Edit Button */}
        <View style={styles.cardHeader}>
          <View style={styles.priorityBadge}>
            <View style={[styles.dot, { backgroundColor: stylesConfig.accent, shadowColor: stylesConfig.accent, shadowOpacity: 0.3, shadowRadius: 4 }]} />
            <Text style={styles.priorityText}>{item.priority.toUpperCase()} PRIORITY</Text>
          </View>
          
          <TouchableOpacity style={styles.editButton}>
            <Feather name="edit-2" size={14} color="white" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Task Title */}
        <Text style={styles.taskTitle}>{item.title}</Text>

        {/* Metadata Row (Time & Date) */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.dueDate}</Text>
          </View>
        </View>

        {/* Separator Line */}
        <View style={styles.separator} />

        {/* Bottom Row: Tags & Check Button */}
        <View style={styles.cardFooter}>
          <View style={styles.tagsContainer}>
            {/* Course Tag */}
            <View style={styles.courseTag}>
              <Text style={styles.courseTagText}>{item.course}</Text>
            </View>
            {/* Difficulty Tag */}
            <View style={[styles.difficultyTag, { backgroundColor: stylesConfig.tagBg, shadowColor: stylesConfig.tagText, shadowOpacity: 0.2, shadowRadius: 2 }]}>
              <Text style={[styles.difficultyText, { color: stylesConfig.tagText }]}>
                {item.difficulty}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.checkButton}>
            <MaterialCommunityIcons name="check" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>Smart Tasks</Text>
            <Text style={styles.headerSubtitle}>AI-powered priority ranking</Text>
        </View>
      </View>

      {/* 2. Horizontal Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity 
                key={filter} 
                style={[styles.filterPill, isActive && styles.activeFilterPill]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                    {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Task List */}
      <FlatList
        data={processedTasks}
        renderItem={renderTaskCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA', // Light Cyan background
  },
  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'linear-gradient(135deg, #4DB6AC 0%, #26A69A 100%)', // Gradient for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  backButton: {
    backgroundColor: '#4DB6AC',
    borderRadius: 50,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#26A69A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },

  /* Filters */
  filterContainer: {
    height: 48,
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 18,
    gap: 10,
  },
  filterPill: {
    backgroundColor: '#B2DFDB', // Inactive light teal
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeFilterPill: {
    backgroundColor: '#26A69A', // Active darker teal
    shadowOpacity: 0.2,
    elevation: 3,
  },
  filterText: {
    color: '#004D40',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },

  /* List */
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 80, // Space for bottom nav
  },

  /* Card Styles */
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    // Enhanced shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editButton: {
    backgroundColor: '#26A69A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  editButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#666',
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  courseTag: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  courseTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
  },
  difficultyTag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkButton: {
    backgroundColor: '#2ECC71', // Green
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});