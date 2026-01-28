import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  coursesCount: number;
  totalUnits: number;
}

export default function SuccessModal({ visible, onClose, coursesCount, totalUnits }: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>

          <Text style={styles.modalTitle}>Import Success</Text>
          <Text style={styles.modalSubtitle}>
            Your schedule has been successfully imported to your digital planner
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{coursesCount}</Text>
              <Text style={styles.statLabel}>Subjects Added</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalUnits}</Text>
              <Text style={styles.statLabel}>Total Units</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Go to Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#20C997',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
});