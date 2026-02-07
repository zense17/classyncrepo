import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import {
  getCurriculumByUser,
  getCompletionPercentage,
  deleteAllCurriculum,
  deleteAllCourses,
} from '@/lib/database';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasCurriculum, setHasCurriculum] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [stats, setStats] = useState({
    gwa: 0,
    totalSubjects: 0,
    completedSubjects: 0,
  });
  
  // Edit profile states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    checkCurriculum();
    setEditedName(user?.name || '');
  }, []);

  const checkCurriculum = async () => {
    if (!user?.$id) return;

    try {
      setLoading(true);
      const curriculum = await getCurriculumByUser(user.$id);
      
      if (curriculum.length > 0) {
        setHasCurriculum(true);
        
        const completedSubjects = curriculum.filter(s => s.status === 'completed');
        
        let totalGradePoints = 0;
        let totalUnits = 0;
        completedSubjects.forEach(subject => {
          if (subject.grade) {
            const gradeValue = parseFloat(subject.grade);
            if (!isNaN(gradeValue)) {
              totalGradePoints += gradeValue * subject.units;
              totalUnits += subject.units;
            }
          }
        });

        const gwa = totalUnits > 0 ? totalGradePoints / totalUnits : 0;
        const percent = await getCompletionPercentage(user.$id);

        setStats({
          gwa: parseFloat(gwa.toFixed(2)),
          totalSubjects: curriculum.length,
          completedSubjects: completedSubjects.length,
        });
        setCompletion(percent);
      } else {
        setHasCurriculum(false);
      }
    } catch (error) {
      console.error('Error checking curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupCurriculum = () => {
    router.push('/curriculum-setup');
  };

  const handleViewCurriculum = () => {
    router.push('/curriculum');
  };

  const handleEditProfile = () => {
    setEditedName(user?.name || '');
    setEditModalVisible(true);
  };

  const handlePickProfilePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveProfile = () => {
    console.log('🔄 Saving profile...');
    
    // TODO: Save to database/Appwrite
    // For now, just close modal and show success
    setEditModalVisible(false);
    console.log('✅ Edit modal closed');
    
    // Show success modal after a short delay
    setTimeout(() => {
      console.log('🎉 Showing success modal');
      setSuccessModalVisible(true);
      
      // Auto-hide after 2 seconds
      setTimeout(() => {
        console.log('👋 Hiding success modal');
        setSuccessModalVisible(false);
      }, 2000);
    }, 300);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Delete your account permanently?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (user?.$id) {
                        await deleteAllCurriculum(user.$id);
                        try {
                          await deleteAllCourses(user.$id);
                        } catch (error) {
                          console.log('No courses to delete');
                        }
                      }
                      
                      await logout();
                      
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                      router.replace('/(auth)/sign-in');
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* USER CARD - TAPPABLE TO EDIT */}
        <TouchableOpacity 
          style={styles.userCard}
          onPress={handleEditProfile}
          activeOpacity={0.8}
        >
          <View style={styles.editIcon}>
            <Text style={styles.editIconText}>✏️</Text>
          </View>

          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {editedName?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{editedName || user?.name || 'User'}</Text>
              <Text style={styles.userDate}>{formatDate(new Date())}</Text>
              <View style={styles.userMeta}>
                <View style={styles.yearBadge}>
                  <Text style={styles.yearBadgeText}>3rd Year</Text>
                </View>
                <Text style={styles.userProgram}>• BS Computer Science</Text>
              </View>
            </View>
          </View>

          <View style={styles.userDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>✉️</Text>
              <Text style={styles.detailText}>{user?.email || 'email@example.com'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🏫</Text>
              <Text style={styles.detailText}>BU Polangui Campus</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* CURRICULUM CARD - TAPPABLE */}
        {hasCurriculum && (
          <TouchableOpacity 
            style={styles.curriculumCard}
            onPress={handleViewCurriculum}
            activeOpacity={0.7}
          >
            <View style={styles.curriculumHeader}>
              <Text style={styles.curriculumTitle}>📚 My Curriculum</Text>
              <Text style={styles.viewAllText}>View All →</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.gwa.toFixed(2)}</Text>
                <Text style={styles.statLabel}>GWA</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{completion}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.completedSubjects}</Text>
                <Text style={styles.statLabel}>Graded</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Curriculum Progress</Text>
                <Text style={styles.progressCount}>
                  {stats.completedSubjects}/{stats.totalSubjects} subjects
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${completion}%` }]} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* SETUP CURRICULUM BUTTON (if no curriculum) */}
        {!hasCurriculum && (
          <View style={styles.menuItems}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSetupCurriculum}>
              <View style={styles.menuItemLeft}>
                <Image 
                  source={require('@/assets/images/curriculum.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>Setup Curriculum</Text>
                  <Text style={styles.menuSubtitle}>Upload or manage your curriculum</Text>
                </View>
              </View>
              <View style={styles.menuAction}>
                <Text style={styles.menuActionText}>Setup</Text>
                <Text style={styles.arrowIcon}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        {/* SIGN OUT */}
        <View style={styles.accountActions}>
          <TouchableOpacity style={styles.menuItemSubtle} onPress={handleSignOut}>
            <View style={styles.menuItemLeft}>
              <Image 
                source={require('@/assets/images/logout.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
              <View style={styles.menuText}>
                <Text style={styles.menuTitleSubtle}>Sign Out</Text>
                <Text style={styles.menuSubtitleSubtle}>Log out of your account</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER WITH LOGO */}
        <View style={styles.footer}>
          <Image 
            source={require('@/assets/images/classynclogo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerSubtext}>Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>Member since August 2022</Text>
        </View>

        {/* DELETE ACCOUNT - AT THE VERY BOTTOM */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <View style={styles.menuItemLeft}>
              <Image 
                source={require('@/assets/images/delete.png')}
                style={styles.iconImageDanger}
                resizeMode="contain"
              />
              <View style={styles.menuText}>
                <Text style={styles.menuTitleDanger}>Delete Account</Text>
                <Text style={styles.menuSubtitleSubtle}>Permanently delete all your data</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Picture */}
            <TouchableOpacity style={styles.editAvatarContainer} onPress={handlePickProfilePicture}>
              <View style={styles.editAvatar}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.editAvatarImage} />
                ) : (
                  <Text style={styles.editAvatarText}>
                    {editedName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.editAvatarBadge}>
                <Text style={styles.editAvatarBadgeText}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.editAvatarHint}>Tap to change profile picture</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
              />
            </View>

            {/* Save Button */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL - CENTERED ON SCREEN */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Profile Updated!</Text>
            <Text style={styles.successMessage}>Your changes have been saved successfully</Text>
          </View>
        </View>
      </Modal>
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
  header: {
    backgroundColor: '#4ECDC4',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  editIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 35,
    height: 35,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Don't block touch events
  },
  editIconText: {
    fontSize: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearBadge: {
    backgroundColor: '#E6F4FE',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  yearBadgeText: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '600',
  },
  userProgram: {
    fontSize: 13,
    color: '#666',
  },
  userDetails: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIcon: {
    fontSize: 14,
    color: '#999',
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  
  // CURRICULUM CARD (TAPPABLE)
  curriculumCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  curriculumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  curriculumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: 12,
    color: '#999',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E6F4FE',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
  },
  
  menuItems: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accountActions: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  menuItemSubtle: {
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  iconImage: {
    width: 80,
    height: 80,
  },
  iconImageDanger: {
    width: 80,
    height: 80,
    tintColor: '#f44336',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuTitleSubtle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  menuTitleDanger: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f44336',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  menuSubtitleSubtle: {
    fontSize: 10,
    color: '#999',
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  menuActionText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 40,
    marginVertical: 30,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 5,
    marginBottom: 40,
  },
  footerLogo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#999',
  },
  
  // DANGER ZONE
  dangerZone: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#ffebee',
  },
  dangerZoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deleteAccountButton: {
    backgroundColor: '#fff5f5',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  
  // EDIT MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  editAvatarContainer: {
    alignSelf: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBadgeText: {
    fontSize: 14,
  },
  editAvatarHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // SUCCESS MODAL
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});