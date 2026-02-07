import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';

interface CurriculumLoadingModalProps {
  visible: boolean;
  progress: string;
}

export default function CurriculumLoadingModal({ visible, progress }: CurriculumLoadingModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ClasSync Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/classynclogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Processing Curriculum</Text>
          <Text style={styles.progress}>{progress}</Text>
          
          {/* Animated Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          </View>
          
          <Text style={styles.hint}>Please wait...</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    width: '85%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  progress: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E6F4FE',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});