import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { updateSubjectGrade, type CurriculumSubject } from '@/lib/database';
import { enhanceScreenPhoto } from '@/lib/image-enhancement';

interface GradeUploadModalProps {
  visible: boolean;
  onClose: () => void;
  subjects: CurriculumSubject[];
  onGradesUpdated: () => void;
}

interface ExtractedGrade {
  code: string;
  grade: number;
  matched: boolean;
  subjectId?: string;
}

export default function GradeUploadModal({ visible, onClose, subjects, onGradesUpdated }: GradeUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [extractedGrades, setExtractedGrades] = useState<ExtractedGrade[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');

  const resetState = () => {
    setSelectedFile(null);
    setExtractedGrades([]);
    setStep('select');
    setProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setStep('preview');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setStep('preview');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert(
          'PDF Support',
          'PDF parsing will be implemented soon. For now, please take a screenshot of your grades and upload as an image.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF');
    }
  };

  // Extract grades from image using OCR
  const extractGradesFromImage = async (imageUri: string): Promise<ExtractedGrade[]> => {
    try {
      console.log('\n📊 EXTRACTING GRADES FROM IMAGE');
      console.log('═'.repeat(50));

      const result = await TextRecognition.recognize(imageUri);
      const allText = result.text;
      
      console.log('📝 Full OCR Text:', allText);

      const grades: ExtractedGrade[] = [];
      
      // Step 1: Get all possible text fragments
      const allTextFragments: string[] = [];
      
      if (result.blocks) {
        result.blocks.forEach((block: any) => {
          if (block.lines) {
            block.lines.forEach((line: any) => {
              const lineText = line.text?.trim();
              if (lineText) {
                allTextFragments.push(lineText);
              }
            });
          }
        });
      }

      console.log(`\n📋 Processing ${allTextFragments.length} text lines...`);
      console.log(`📚 Curriculum has ${subjects.length} subjects to match against`);

      // Step 2: For each curriculum subject, try to find it in OCR text
      const foundCodes = new Set<string>(); // Prevent duplicates
      
      for (const subject of subjects) {
        const code = subject.subjectCode;
        
        // Generate possible OCR variations of this code
        const codeVariations = [
          code,                                          // "GEC 16"
          code.replace(/\s+/g, ''),                     // "GEC16"
          code.replace(/\s+/g, '-'),                    // "GEC-16"
          code.replace(/\s+/g, ' ').toLowerCase(),      // "gec 16"
          code.replace(/\s+/g, '').toLowerCase(),       // "gec16"
          code.replace(/Elec/i, 'Elect'),               // "GEC Elect 21"
          code.replace(/Elec/i, 'ELEC'),                // "GEC ELEC 21"
          code.replace(/PATHFIT/i, 'PATHFit'),          // "PATHFit 1"
          code.replace(/PATHFIT/i, 'Pathfit'),          // "Pathfit 1"
          code.replace(/MATH/i, 'Math'),                // "Math 101"
          code.replace(/PHYS/i, 'Phys'),                // "Phys 1"
          code.replace(/GEC/i, 'Gec'),                  // "Gec 16"
        ];

        // Check if any variation appears in the OCR text
        let found = false;
        for (const variation of codeVariations) {
          // Case-insensitive search in all text
          const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          
          if (regex.test(allText)) {
            console.log(`   ✓ Found: "${code}" (matched as "${variation}")`);
            found = true;
            foundCodes.add(code);
            break;
          }
        }
      }

      console.log(`\n📊 Found ${foundCodes.size} subject codes in image`);

      // Step 3: Extract all grade values from text
      const gradeValues: number[] = [];
      const gradePattern = /\b([1-2]\.\d{1,2})\s*[•e]?\b/g;
      
      let match;
      while ((match = gradePattern.exec(allText)) !== null) {
        const grade = parseFloat(match[1]);
        if (grade >= 1.0 && grade <= 2.0) { // Most grades are 1.0-2.0 range
          gradeValues.push(grade);
          console.log(`   📊 Found grade: ${grade}`);
        }
      }

      console.log(`\n📊 Found ${gradeValues.length} grade values`);

      // Step 4: Match codes with grades (assume same order)
      const codesArray = Array.from(foundCodes);
      const matchCount = Math.min(codesArray.length, gradeValues.length);

      console.log(`\n🔗 Matching ${matchCount} pairs...`);

      for (let i = 0; i < matchCount; i++) {
        const code = codesArray[i];
        const grade = gradeValues[i];
        
        // Find the actual subject object
        const matchedSubject = subjects.find(s => s.subjectCode === code);
        
        if (matchedSubject) {
          console.log(`   ✅ ${code} → ${grade} (${matchedSubject.subjectName})`);
          
          grades.push({
            code: code,
            grade: grade,
            matched: true,
            subjectId: matchedSubject.$id,
          });
        }
      }

      console.log(`\n📊 Extraction Summary:`);
      console.log(`   Total grades found: ${grades.length}`);
      console.log(`   Matched subjects: ${grades.filter(g => g.matched).length}`);
      console.log(`   Unmatched: ${grades.filter(g => !g.matched).length}`);
      console.log('═'.repeat(50));

      return grades;
    } catch (error) {
      console.error('Error extracting grades:', error);
      throw error;
    }
  };

  // Find matching subject in curriculum
  const findMatchingSubject = (code: string): CurriculumSubject | null => {
    // Normalize both codes for comparison
    const normalizeCode = (c: string) => {
      return c.toUpperCase()
        .replace(/\s+/g, '')
        .replace(/-/g, '')
        .replace(/ELEC/i, 'ELEC')
        .replace(/PATHFIT/i, 'PATHFIT')
        .replace(/PHYS/i, 'PHYS')
        .replace(/MATH/i, 'MATH')
        .replace(/GEC/i, 'GEC')
        .replace(/NSTP/i, 'NSTP')
        .replace(/CS/i, 'CS');
    };

    const normalizedSearchCode = normalizeCode(code);
    console.log(`      🔍 Searching for: "${code}" → normalized: "${normalizedSearchCode}"`);

    // Try exact match first
    let match = subjects.find(s => {
      const normalized = normalizeCode(s.subjectCode);
      return normalized === normalizedSearchCode;
    });
    
    if (match) {
      console.log(`      ✓ Exact match: ${match.subjectCode}`);
      return match;
    }

    // Try fuzzy match
    match = subjects.find(s => {
      const subjCode = normalizeCode(s.subjectCode);
      
      // Check if one contains the other
      if (subjCode.includes(normalizedSearchCode) || normalizedSearchCode.includes(subjCode)) {
        return true;
      }
      
      // Check with different spacing
      const searchParts = code.split(/[\s-]+/);
      const subjParts = s.subjectCode.split(/[\s-]+/);
      
      if (searchParts.length === subjParts.length) {
        return searchParts.every((part, i) => 
          part.toUpperCase() === subjParts[i].toUpperCase()
        );
      }
      
      return false;
    });

    if (match) {
      console.log(`      ✓ Fuzzy match: ${match.subjectCode}`);
    } else {
      console.log(`      ✗ No match found`);
    }

    return match || null;
  };

  const handleProcessImage = async () => {
    if (!selectedFile?.uri) return;

    setProcessing(true);
    try {
      console.log('\n🎨 Starting image processing...');
      
      // Step 1: Enhance image quality
      setProcessingStatus('Enhancing image quality...');
      console.log('🎨 Enhancing image for better OCR...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const enhancementResult = await enhanceScreenPhoto(selectedFile.uri);
      
      if (enhancementResult.enhanced) {
        console.log('✓ Image enhanced successfully');
      } else {
        console.log('⚠️ Using original image (enhancement failed)');
      }

      // Step 2: Extract grades using OCR
      setProcessingStatus('Scanning grade table with OCR...');
      console.log('🔍 Extracting grades from image...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const grades = await extractGradesFromImage(enhancementResult.uri);
      
      if (grades.length === 0) {
        setProcessing(false);
        setProcessingStatus('');
        Alert.alert(
          'No Grades Found',
          'Could not extract any grades from the image.\n\n📸 Tips for Camera Photos:\n\n• Use good lighting (avoid shadows)\n• Take photo straight-on (90° angle)\n• Avoid screen glare/reflections\n• Keep camera steady\n• Make sure text is sharp\n• Fill frame with grade table\n\n💡 TIP: Screenshots work better than photos!',
          [{ text: 'Try Again', onPress: () => {
            setStep('select');
            setSelectedFile(null);
          }}]
        );
        return;
      }

      setProcessingStatus('Matching with your curriculum...');
      console.log(`✅ Successfully extracted ${grades.length} grades`);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setExtractedGrades(grades);
      setStep('confirm');
    } catch (error) {
      console.error('❌ Error processing image:', error);
      Alert.alert(
        'Processing Error',
        'Failed to extract grades from image.\n\n💡 Suggestions:\n\n• Try taking a clearer photo\n• Improve lighting conditions\n• Take a screenshot instead\n• Move closer to the screen\n• Avoid reflections and glare',
        [
          { text: 'Try Again', onPress: () => {
            setStep('select');
            setSelectedFile(null);
          }},
          { text: 'Cancel' }
        ]
      );
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleConfirmUpload = async () => {
    const matchedGrades = extractedGrades.filter(g => g.matched);
    
    if (matchedGrades.length === 0) {
      Alert.alert(
        'No Matches',
        'None of the extracted grades match your curriculum subjects. Please check your image and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Upload',
      `Upload ${matchedGrades.length} grades to your curriculum?\n\n${matchedGrades.map(g => `${g.code}: ${g.grade}`).join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            setProcessing(true);
            try {
              let successCount = 0;
              let failCount = 0;

              setProcessingStatus('Uploading grades to database...');
              await new Promise(resolve => setTimeout(resolve, 300));

              for (const grade of matchedGrades) {
                if (grade.subjectId) {
                  try {
                    console.log(`📝 Updating ${grade.code} (ID: ${grade.subjectId}) → Grade: ${grade.grade}`);
                    await updateSubjectGrade(grade.subjectId, grade.grade);
                    console.log(`✅ Successfully updated ${grade.code}`);
                    successCount++;
                  } catch (error) {
                    console.error(`❌ Failed to update ${grade.code}:`, error);
                    failCount++;
                  }
                }
              }

              setProcessingStatus('Syncing with curriculum...');
              await new Promise(resolve => setTimeout(resolve, 300));

              if (successCount > 0) {
                // Immediately call onGradesUpdated to reload curriculum
                onGradesUpdated();
                
                Alert.alert(
                  'Upload Complete',
                  `Successfully uploaded ${successCount} grade${successCount > 1 ? 's' : ''}!${failCount > 0 ? `\n\n${failCount} failed to upload.` : ''}\n\nYour grades have been updated.`,
                  [{ text: 'OK', onPress: () => {
                    handleClose();
                  }}]
                );
              } else {
                Alert.alert('Upload Failed', 'Failed to upload grades. Please try again.');
              }
            } catch (error) {
              console.error('Error uploading grades:', error);
              Alert.alert('Error', 'Failed to upload grades');
            } finally {
              setProcessing(false);
              setProcessingStatus('');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Grades</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'select' && (
            <View style={styles.selectStep}>
              <Text style={styles.stepTitle}>📸 Select Grade Document</Text>
              <Text style={styles.stepDescription}>
                Upload a screenshot or photo of your grades from the student portal
              </Text>

              <View style={styles.uploadOptions}>
                <TouchableOpacity style={styles.uploadOption} onPress={handleTakePhoto}>
                  <Text style={styles.uploadOptionIcon}>📷</Text>
                  <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                  <Text style={styles.uploadOptionDesc}>Use camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadOption} onPress={handlePickImage}>
                  <Text style={styles.uploadOptionIcon}>🖼️</Text>
                  <Text style={styles.uploadOptionTitle}>Pick Image</Text>
                  <Text style={styles.uploadOptionDesc}>From gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadOption} onPress={handlePickPDF}>
                  <Text style={styles.uploadOptionIcon}>📄</Text>
                  <Text style={styles.uploadOptionTitle}>Pick PDF</Text>
                  <Text style={styles.uploadOptionDesc}>Coming soon</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
                <Text style={styles.tipText}>• Capture the entire grades table</Text>
                <Text style={styles.tipText}>• Ensure good lighting (no shadows)</Text>
                <Text style={styles.tipText}>• Keep text clear and readable</Text>
                <Text style={styles.tipText}>• Include subject codes and grades</Text>
                <Text style={styles.tipText}>• Avoid glare on screen</Text>
              </View>
            </View>
          )}

          {step === 'preview' && selectedFile && (
            <View style={styles.previewStep}>
              <Text style={styles.stepTitle}>📋 Preview Image</Text>
              <Text style={styles.stepDescription}>
                Check if the image is clear and grades are visible
              </Text>

              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="contain" />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => {
                    setSelectedFile(null);
                    setStep('select');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>← Choose Different Image</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.primaryButton, processing && styles.buttonDisabled]} 
                  onPress={handleProcessImage}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Extract Grades →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.confirmStep}>
              <Text style={styles.stepTitle}>✅ Review Extracted Grades</Text>
              <Text style={styles.stepDescription}>
                Found {extractedGrades.length} grade{extractedGrades.length !== 1 ? 's' : ''} • 
                {' '}{extractedGrades.filter(g => g.matched).length} matched
              </Text>

              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Extracted:</Text>
                  <Text style={styles.summaryValue}>{extractedGrades.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>✓ Matched:</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {extractedGrades.filter(g => g.matched).length}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#F57C00' }]}>⚠ Not Found:</Text>
                  <Text style={[styles.summaryValue, { color: '#F57C00' }]}>
                    {extractedGrades.filter(g => !g.matched).length}
                  </Text>
                </View>
              </View>

              {/* Grades List */}
              <View style={styles.gradesList}>
                {extractedGrades.map((grade, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.gradeItem,
                      grade.matched ? styles.gradeItemMatched : styles.gradeItemUnmatched
                    ]}
                  >
                    <View style={styles.gradeItemLeft}>
                      <Text style={styles.gradeItemIcon}>
                        {grade.matched ? '✓' : '⚠️'}
                      </Text>
                      <View>
                        <Text style={styles.gradeItemCode}>{grade.code}</Text>
                        <Text style={styles.gradeItemStatus}>
                          {grade.matched ? 'Will be updated' : 'Not in curriculum'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.gradeItemValue}>{grade.grade.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              {extractedGrades.filter(g => !g.matched).length > 0 && (
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>
                    ⚠️ Some grades don't match your curriculum subjects. Only matched grades will be uploaded.
                  </Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => {
                    setExtractedGrades([]);
                    setStep('preview');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.primaryButton,
                    (processing || extractedGrades.filter(g => g.matched).length === 0) && styles.buttonDisabled
                  ]} 
                  onPress={handleConfirmUpload}
                  disabled={processing || extractedGrades.filter(g => g.matched).length === 0}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Upload {extractedGrades.filter(g => g.matched).length} Grades
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Loading Overlay with ClasSync Logo */}
        {processing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Image
                source={require('@/assets/images/classynclogo.png')}
                style={styles.loadingLogo}
                resizeMode="contain"
              />
              <Text style={styles.loadingTitle}>Processing Grades</Text>
              <Text style={styles.loadingStatus}>{processingStatus}</Text>
              <View style={styles.loadingBarContainer}>
                <View style={styles.loadingBar}>
                  <View style={styles.loadingBarFill} />
                </View>
              </View>
              <Text style={styles.loadingHint}>Please wait...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Select Step
  selectStep: {},
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  uploadOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadOptionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  uploadOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadOptionDesc: {
    fontSize: 12,
    color: '#999',
  },
  tipsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#1565C0',
    marginBottom: 6,
    lineHeight: 18,
  },
  
  // Preview Step
  previewStep: {},
  imagePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: 400,
  },
  
  // Confirm Step
  confirmStep: {},
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  gradesList: {
    marginBottom: 20,
  },
  gradeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
  },
  gradeItemMatched: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  gradeItemUnmatched: {
    borderColor: '#F57C00',
    backgroundColor: '#FFF3E0',
  },
  gradeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gradeItemIcon: {
    fontSize: 20,
  },
  gradeItemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  gradeItemStatus: {
    fontSize: 12,
    color: '#666',
  },
  gradeItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
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
  loadingLogo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingStatus: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  loadingBarContainer: {
    width: '100%',
    marginBottom: 16,
  },
  loadingBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E6F4FE',
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  loadingHint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});