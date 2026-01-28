import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Course, updateCourse } from '@/lib/database';
import CustomAlert from './Alerts';

interface EditModalProps {
  visible: boolean;
  course: Course;
  onClose: () => void;
  onSave: () => void;
}

export default function EditModal({ visible, course, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    title: course.title,
    code: course.code,
    room: course.room,
    faculty: course.faculty,
    time: course.time,
    units: course.units?.toString() || '0',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setForm({
      title: course.title,
      code: course.code,
      room: course.room,
      faculty: course.faculty,
      time: course.time,
      units: course.units?.toString() || '0',
    });
  }, [course]);

  const handleUpdate = async () => {
    try {
      await updateCourse(course.$id!, {
        ...form,
        units: parseInt(form.units),
      });
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={[styles.colorIndicator, { backgroundColor: Colors.secondary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCourseCode}>Edit Course</Text>
              <Text style={styles.modalCourseTitle}>Modify schedule details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {renderInput("book-outline", "Course Title", form.title, (t) => setForm({...form, title: t}))}
            {renderInput("barcode-outline", "Course Code", form.code, (t) => setForm({...form, code: t}))}
            {renderInput("time-outline", "Schedule", form.time, (t) => setForm({...form, time: t}))}
            {renderInput("location-outline", "Room", form.room, (t) => setForm({...form, room: t}))}
            {renderInput("person-outline", "Faculty", form.faculty, (t) => setForm({...form, faculty: t}))}
            {renderInput("school-outline", "Units", form.units, (t) => setForm({...form, units: t}), "numeric")}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CustomAlert 
          visible={showSuccess}
          type="success"
          title="Updated!"
          message="Course details have been successfully modified."
          onClose={() => {
            setShowSuccess(false);
            onSave();
          }}
        />
      </View>
    </Modal>
  );
}

function renderInput(icon: any, label: string, value: string, onChange: (t: string) => void, keyboard: any = "default") {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={20} color={Colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <TextInput 
          style={styles.inputField} 
          value={value} 
          onChangeText={onChange} 
          keyboardType={keyboard}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 400, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 12 },
  colorIndicator: { width: 6, height: 50, borderRadius: 3 },
  modalCourseCode: { fontSize: 20, fontWeight: '800', color: '#0F2F2A' },
  modalCourseTitle: { fontSize: 14, color: '#6B7280' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  detailIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  inputField: { fontSize: 15, color: '#1F2937', fontWeight: '600', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  saveBtn: { backgroundColor: Colors.secondary, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});