import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'delete';
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: CustomAlertProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#10B981' };
      case 'error': return { name: 'alert-circle', color: '#EF4444' };
      case 'delete': return { name: 'trash', color: '#DC2626' };
      default: return { name: 'information-circle', color: Colors.secondary };
    }
  };

  const icon = getIcon();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
            <Ionicons name={icon.name as any} size={32} color={icon.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {onConfirm && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.confirmBtn, 
                { backgroundColor: type === 'delete' ? '#DC2626' : Colors.secondary }
              ]} 
              onPress={onConfirm || onClose}
            >
              <Text style={styles.confirmBtnText}>
                {onConfirm ? confirmText : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertContainer: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F2F2A', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#6B7280', fontWeight: '700', fontSize: 15 },
});