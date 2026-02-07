import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useAuth } from '@/lib/auth-context';
import { addCurriculumSubjects } from '@/lib/database';
import CurriculumLoadingModal from '@/components/CurriculumLoadingModal';
import * as ImageManipulator from 'expo-image-manipulator';
import { applyPostProcessingRules, calculateActualAccuracy } from '@/lib/curriculum-post-processing';
import { preprocessImageForOCR, preprocessCameraImage } from '@/lib/image-preprocessing';

export default function CurriculumSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [isFromCamera, setIsFromCamera] = useState(false); // ← NEW: Track image source

  const handleBrowseFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setIsFromCamera(false); // ← NEW: Mark as file upload
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false, // ← CHANGED: Preserve quality
        exif: false,          // ← NEW: Less overhead
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setIsFromCamera(true); // ← NEW: Mark as camera image
        console.log('📸 Camera image captured - will use enhanced preprocessing');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const splitImageIntoQuadrants = async (imageUri: string) => {
    try {
      // ← ENHANCED: Camera-specific preprocessing
      console.log(`🔧 Preprocessing image (${isFromCamera ? 'CAMERA' : 'FILE'}) for optimal OCR...`);
      
      let preprocessedUri: string;
      if (isFromCamera) {
        // Camera images get MORE aggressive preprocessing (3200px)
        preprocessedUri = await preprocessCameraImage(imageUri);
      } else {
        // File uploads get standard preprocessing (2400px)
        preprocessedUri = await preprocessImageForOCR(imageUri, {
          isCameraImage: false,
        });
      }
      
      // Now split the preprocessed image
      const imageInfo = await ImageManipulator.manipulateAsync(preprocessedUri, [], {});
      const { width, height } = imageInfo;

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      const topLeft = await ImageManipulator.manipulateAsync(
        preprocessedUri,
        [{ crop: { originX: 0, originY: 0, width: halfWidth, height: halfHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      const topRight = await ImageManipulator.manipulateAsync(
        preprocessedUri,
        [{ crop: { originX: halfWidth, originY: 0, width: halfWidth, height: halfHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      const bottomLeft = await ImageManipulator.manipulateAsync(
        preprocessedUri,
        [{ crop: { originX: 0, originY: halfHeight, width: halfWidth, height: halfHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      const bottomRight = await ImageManipulator.manipulateAsync(
        preprocessedUri,
        [{ crop: { originX: halfWidth, originY: halfHeight, width: halfWidth, height: halfHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      return {
        topLeft: topLeft.uri,
        topRight: topRight.uri,
        bottomLeft: bottomLeft.uri,
        bottomRight: bottomRight.uri,
      };
    } catch (error) {
      console.error('Error splitting image:', error);
      throw error;
    }
  };

  const extractOCRResult = async (imageUri: string) => {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result;
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  };

  const detectYearRange = (text: string): '1-2' | '3-4' => {
    const firstYearCodes = /CS\s*(101|102|103|104|105|106|107|108|109|110|111|112|113)/i;
    const thirdYearCodes = /CS\s*(114|115|116|117|118|119|120|121|122|123|124|125|126)/i;
    
    const firstYearCount = (text.match(new RegExp(firstYearCodes, 'gi')) || []).length;
    const thirdYearCount = (text.match(new RegExp(thirdYearCodes, 'gi')) || []).length;
    
    console.log(`📊 Year Detection:`);
    console.log(`   1st-2nd Year codes found: ${firstYearCount}`);
    console.log(`   3rd-4th Year codes found: ${thirdYearCount}`);
    
    if (thirdYearCount > firstYearCount) {
      console.log(`   ✅ Detected: 3rd-4th Year page`);
      return '3-4';
    }
    
    console.log(`   ✅ Detected: 1st-2nd Year page`);
    return '1-2';
  };

  const parseTableWithPositions = (ocrResult: any, defaultYear: string, defaultSemester: string) => {
    const subjects = [];
    
    console.log(`\n🔍 Parsing ${defaultYear} - ${defaultSemester}`);
    console.log('━'.repeat(50));

    const textElements: Array<{text: string, x: number, y: number}> = [];
    
    if (ocrResult.blocks) {
      ocrResult.blocks.forEach((block: any) => {
        if (block.lines) {
          block.lines.forEach((line: any) => {
            if (line.elements) {
              line.elements.forEach((element: any) => {
                if (element.text && element.frame) {
                  textElements.push({
                    text: element.text.trim(),
                    x: element.frame.left || 0,
                    y: element.frame.top || 0,
                  });
                }
              });
            }
          });
        }
      });
    }

    console.log(`📝 Collected ${textElements.length} text elements`);

    if (textElements.length === 0) {
      console.log('⚠️ No elements found');
      return subjects;
    }

    const rows: Array<{y: number, elements: any[]}> = [];
    
    textElements.forEach(element => {
      let existingRow = rows.find(row => Math.abs(row.y - element.y) < 25);
      
      if (!existingRow) {
        existingRow = { y: element.y, elements: [] };
        rows.push(existingRow);
      }
      
      existingRow.elements.push(element);
    });

    rows.sort((a, b) => a.y - b.y);
    rows.forEach(row => {
      row.elements.sort((a, b) => a.x - b.x);
    });

    console.log(`📊 Organized into ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const elements = row.elements;
      
      if (elements.length === 0) continue;

      const firstText = elements[0].text;
      
      if (firstText.match(/^(Total|YEAR|Semester|First|Second|Third|Fourth|Summer|Course|Descriptive|Lec|Lab|Units|Grade|Rating|Rem\.|REVISION|PROFESSIONAL|ELECTIVES|Complexity|Computational|Compiler|Robotic|Parallel|Computer|Distributed|Mobile|Network|Data|Living|Great|Books|Environmental|Entrepreneurial|Systems|Performance|Analysis|Design|Construction|Vision|Visualization|Graphics|Modelling|Monitoring|TOTAL|NO\.|OF|Science|Technology|Society|Agham|Teknolohiya|Lipunan|Ethics|Appreciatier|Pagpapatalaga|Sining|Issues|Practice|Works|Rizal|Era|Human|Reproduction|Mind)$/i)) {
        continue;
      }

      let courseNo = '';
      let titleStartIndex = 0;
      let allElements = [...elements];

      if (firstText.match(/^[A-Z]$/i) && elements.length > 1 && /^[01]\d+$/.test(elements[1].text)) {
        courseNo = `CS ${elements[1].text}`;
        titleStartIndex = 2;
        console.log(`   🔧 Fixed OCR error: "${firstText} ${elements[1].text}" → ${courseNo}`);
      }
      else if (firstText.match(/^CS$/i) && elements.length > 1 && elements[1].text.match(/^Elec(tive)?$/i)) {
        let elecNum = '1';
        for (let j = 2; j < Math.min(elements.length, 6); j++) {
          if (/^\d+$/.test(elements[j].text) && parseInt(elements[j].text) <= 5) {
            elecNum = elements[j].text;
            titleStartIndex = j + 1;
            break;
          }
        }
        if (titleStartIndex === 0) titleStartIndex = 2;
        courseNo = `CS Elec ${elecNum}`;
        console.log(`   ✓ CS Elective: ${courseNo}`);
      }
      else if (firstText.match(/^GEC$/i) && elements.length > 1 && elements[1].text.match(/^Elec(tive)?$/i)) {
        let elecNum = '1';
        for (let j = 2; j < Math.min(elements.length, 6); j++) {
          const txt = elements[j].text;
          if (/^\d+$/.test(txt) && parseInt(txt) <= 25) {
            elecNum = txt;
            titleStartIndex = j + 1;
            break;
          }
        }
        if (titleStartIndex === 0) titleStartIndex = 2;
        courseNo = `GEC Elec ${elecNum}`;
        console.log(`   ✓ GEC Elective: ${courseNo}`);
      }
      else if (firstText.match(/^MATH$/i) && elements.length > 1 && elements[1].text.match(/^Elec(tive)?$/i)) {
        let elecNum = '101';
        for (let j = 2; j < Math.min(elements.length, 6); j++) {
          if (/^\d+$/.test(elements[j].text) && parseInt(elements[j].text) >= 100) {
            elecNum = elements[j].text;
            titleStartIndex = j + 1;
            break;
          }
        }
        if (titleStartIndex === 0) titleStartIndex = 2;
        courseNo = `Math Elec ${elecNum}`;
        console.log(`   ✓ Math Elective: ${courseNo}`);
      }
      else if (firstText.match(/^([A-Z]{2,10})$/i) && elements.length > 1) {
        const coursePrefix = firstText.toUpperCase();
        
        if (coursePrefix === 'TOTAL' || coursePrefix === 'YEAR') {
          continue;
        }

        const secondText = elements[1].text;
        
        if (/^[01]?\d+$/.test(secondText)) {
          courseNo = `${coursePrefix} ${secondText}`;
          titleStartIndex = 2;
        }
        else if (coursePrefix.match(/^(PATHFIT|PATHEIT)$/i)) {
          const num = elements.find(e => /^\d+$/.test(e.text))?.text || '1';
          courseNo = `PATHFIT ${num}`;
          titleStartIndex = elements.findIndex(e => /^\d+$/.test(e.text)) + 1 || 2;
          console.log(`   🔧 Fixed: ${firstText} → ${courseNo}`);
        }
        else {
          continue;
        }
      }
      else {
        continue;
      }

      console.log(`   ✅ Extracting: ${courseNo}`);
      
      const isElective = courseNo.includes('Elec');
      if (!isElective && i + 1 < rows.length) {
        const nextRow = rows[i + 1];
        if (nextRow.elements.length > 0) {
          const nextFirstText = nextRow.elements[0]?.text || '';
          const nextSecondText = nextRow.elements[1]?.text || '';
          
          const isNextRowCourse = 
            (nextFirstText.match(/^[A-Z]$/i) && /^\d+$/.test(nextSecondText)) ||
            (nextFirstText.match(/^[A-Z]{2,10}$/i) && /^\d+$/.test(nextSecondText)) ||
            (nextFirstText === 'Math' && nextSecondText === 'Elec') ||
            (nextFirstText.match(/^(CS|GEC)$/i) && nextSecondText.match(/^Elec$/i)) ||
            nextFirstText.match(/^(Total|YEAR|First|Second|Summer|TOTAL)/i);
          
          if (!isNextRowCourse) {
            allElements = [...allElements, ...nextRow.elements];
            i++;
          }
        }
      }
      
      let lecUnits = 0;
      let labUnits = 0;
      let totalUnits = 0;
      let numberSequence: (number | null)[] = [];
      let numberEndIndex = -1;
      
      for (let j = allElements.length - 1; j >= titleStartIndex; j--) {
        const text = allElements[j].text;
        
        if (/^\d+$/.test(text)) {
          const num = parseInt(text);
          
          if (num <= 5) {
            numberSequence.unshift(num);
            
            if (numberSequence.length === 3) {
              numberEndIndex = j;
              break;
            }
          } else {
            numberSequence = [];
          }
        } else if (numberSequence.length > 0 && numberSequence.length < 3) {
          numberSequence = [];
        }
      }
      
      if (numberSequence.length === 2) {
        lecUnits = numberSequence[0] as number;
        labUnits = 0;
        totalUnits = numberSequence[1] as number;
      } else if (numberSequence.length >= 3) {
        lecUnits = numberSequence[0] as number;
        labUnits = numberSequence[1] as number;
        totalUnits = numberSequence[2] as number;
      } else {
        lecUnits = 3;
        labUnits = 0;
        totalUnits = 3;
      }
      
      const titleEndIndex = numberEndIndex > 0 ? numberEndIndex : allElements.length;
      let titleElements: string[] = [];
      
      for (let j = titleStartIndex; j < titleEndIndex; j++) {
        const text = allElements[j].text;
        if (!/^\d+$/.test(text) && 
            !text.match(/^(Total|Grade|Rating|Rem\.|O\.H|Elec|OA|CS|APAM|J)$/i) && 
            text.length > 1) {
          titleElements.push(text);
        }
      }
      
      let descriptiveTitle = titleElements.join(' ').trim();
      
      descriptiveTitle = descriptiveTitle
        .replace(/\s+/g, ' ')
        .replace(/[|_]/g, '')
        .replace(/\s+Total$/gi, '')
        .replace(/\s+Grade$/gi, '')
        .replace(/\s+Elective$/gi, '')
        .trim();

      if (descriptiveTitle.length > 200) {
        descriptiveTitle = descriptiveTitle.substring(0, 197) + '...';
      }

      if (!descriptiveTitle || descriptiveTitle.length < 2) {
        if (courseNo.includes('Elec')) {
          descriptiveTitle = courseNo.includes('CS') ? 'CS Elective' : 
                           courseNo.includes('GEC') ? 'GEC Elective' : 
                           'Math Elective';
        } else {
          descriptiveTitle = 'Subject';
        }
      }

      subjects.push({
        subjectCode: courseNo,
        subjectName: descriptiveTitle,
        units: totalUnits,
        lecUnits: lecUnits,
        labUnits: labUnits,
        yearLevel: defaultYear,
        semester: defaultSemester,
        status: 'upcoming',
        grade: null,
        instructor: null,
      });

      console.log(`   📝 ${courseNo} | ${descriptiveTitle.substring(0, 40)}... | Lec: ${lecUnits} Lab: ${labUnits} Total: ${totalUnits}`);
    }

    // ═══════════════════════════════════════════════════════════
    // 🚨 RESCUE PASS: Catch missed electives and CS 107
    // ═══════════════════════════════════════════════════════════
    console.log(`\n🚨 RESCUE PASS: Scanning for missed subjects...`);
    
    const extractedCodes = new Set(subjects.map(s => s.subjectCode));
    let rescuedCount = 0;
    
    // Look for "CS Elec" or "CS Elective" in any row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowText = row.elements.map(e => e.text).join(' ');
      
      if (rowText.match(/CS\s*(Elec|Elective)/i)) {
        const elements = row.elements;
        for (let j = 0; j < elements.length; j++) {
          if (elements[j].text.match(/^(Elec|Elective)$/i)) {
            for (let k = j + 1; k < Math.min(elements.length, j + 5); k++) {
              if (/^[1-5]$/.test(elements[k].text)) {
                const elecCode = `CS Elec ${elements[k].text}`;
                if (!extractedCodes.has(elecCode)) {
                  console.log(`   🎯 RESCUED: ${elecCode}`);
                  subjects.push({
                    subjectCode: elecCode,
                    subjectName: `CS Elective ${elements[k].text}`,
                    units: 3,
                    lecUnits: 3,
                    labUnits: 0,
                    yearLevel: defaultYear,
                    semester: defaultSemester,
                    status: 'upcoming',
                    grade: null,
                    instructor: null,
                  });
                  extractedCodes.add(elecCode);
                  rescuedCount++;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (rowText.match(/GEC\s*(Elec|Elective)/i)) {
        const elements = row.elements;
        for (let j = 0; j < elements.length; j++) {
          if (elements[j].text.match(/^(Elec|Elective)$/i)) {
            for (let k = j + 1; k < Math.min(elements.length, j + 5); k++) {
              const num = elements[k].text;
              if (/^[12]$/.test(num) || /^2[12]$/.test(num)) {
                const elecCode = `GEC Elec ${num}`;
                if (!extractedCodes.has(elecCode)) {
                  console.log(`   🎯 RESCUED: ${elecCode}`);
                  subjects.push({
                    subjectCode: elecCode,
                    subjectName: `GEC Elective ${num}`,
                    units: 3,
                    lecUnits: 3,
                    labUnits: 0,
                    yearLevel: defaultYear,
                    semester: defaultSemester,
                    status: 'upcoming',
                    grade: null,
                    instructor: null,
                  });
                  extractedCodes.add(elecCode);
                  rescuedCount++;
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    // Look for CS 107 specifically
    if (defaultYear === '1st Year' && defaultSemester === '2nd Semester') {
      if (!extractedCodes.has('CS 107')) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowText = row.elements.map(e => e.text).join(' ');
          if (rowText.includes('107') && (rowText.match(/Digital|System|Design/i) || rowText.includes('CS'))) {
            console.log(`   🎯 RESCUED: CS 107`);
            subjects.push({
              subjectCode: 'CS 107',
              subjectName: 'Digital System Design',
              units: 3,
              lecUnits: 2,
              labUnits: 1,
              yearLevel: '1st Year',
              semester: '2nd Semester',
              status: 'upcoming',
              grade: null,
              instructor: null,
            });
            extractedCodes.add('CS 107');
            rescuedCount++;
            break;
          }
        }
      }
    }
    
    if (rescuedCount > 0) {
      console.log(`✅ RESCUE PASS: Added ${rescuedCount} missed subjects`);
    }

    console.log(`\n📊 Found ${subjects.length} subjects in ${defaultYear} - ${defaultSemester}\n`);
    return subjects;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select a file first');
      return;
    }

    if (!user?.$id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      // ← NEW: Enhanced logging
      console.log(`\n📸 Processing ${isFromCamera ? 'CAMERA' : 'FILE UPLOAD'} image...`);
      
      setLoadingProgress('Analyzing curriculum page...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // ← NEW: Enhanced initial scan for camera images
      let initialUri = selectedFile.uri;
      if (isFromCamera) {
        console.log('📸 Applying camera preprocessing for initial scan...');
        initialUri = await preprocessCameraImage(selectedFile.uri);
      }

      const quickScan = await extractOCRResult(initialUri);
      const detectedYears = detectYearRange(quickScan.text);
      
      console.log(`\n🎯 AUTO-DETECTED PAGE: ${detectedYears === '1-2' ? '1st-2nd Year' : '3rd-4th Year'}`);
      console.log(`📸 Image source: ${isFromCamera ? 'CAMERA (enhanced 3200px)' : 'FILE UPLOAD (standard 2400px)'}\n`);

      setLoadingProgress('Enhancing image quality...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const { topLeft, topRight, bottomLeft, bottomRight } = await splitImageIntoQuadrants(selectedFile.uri);

      const firstYear = detectedYears === '1-2' ? '1st Year' : '3rd Year';
      const secondYear = detectedYears === '1-2' ? '2nd Year' : '4th Year';

      setLoadingProgress(`Extracting ${firstYear} - 1st Semester...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const topLeftResult = await extractOCRResult(topLeft);
      const topLeftSubjects = parseTableWithPositions(topLeftResult, firstYear, '1st Semester');

      setLoadingProgress(`Extracting ${firstYear} - 2nd Semester...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const topRightResult = await extractOCRResult(topRight);
      const topRightSubjects = parseTableWithPositions(topRightResult, firstYear, '2nd Semester');

      setLoadingProgress(`Extracting ${secondYear} - 1st Semester...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const bottomLeftResult = await extractOCRResult(bottomLeft);
      const bottomLeftSubjects = parseTableWithPositions(bottomLeftResult, secondYear, '1st Semester');

      setLoadingProgress(`Extracting ${secondYear} - 2nd Semester...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const bottomRightResult = await extractOCRResult(bottomRight);
      const bottomRightSubjects = parseTableWithPositions(bottomRightResult, secondYear, '2nd Semester');

      const allSubjects = [
        ...topLeftSubjects,
        ...topRightSubjects,
        ...bottomLeftSubjects,
        ...bottomRightSubjects,
      ];

      setLoadingProgress('Applying intelligent corrections...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const postProcessed = applyPostProcessingRules(allSubjects);
      const actualAccuracy = calculateActualAccuracy(postProcessed.subjects);

      console.log('\n📊 EXTRACTION SUMMARY');
      console.log('═'.repeat(50));
      console.log(`Image Source: ${isFromCamera ? '📸 CAMERA (3200px enhanced)' : '📁 FILE UPLOAD (2400px standard)'}`);
      console.log(`${firstYear} - 1st Semester: ${topLeftSubjects.length} subjects`);
      console.log(`${firstYear} - 2nd Semester: ${topRightSubjects.length} subjects`);
      console.log(`${secondYear} - 1st Semester: ${bottomLeftSubjects.length} subjects`);
      console.log(`${secondYear} - 2nd Semester: ${bottomRightSubjects.length} subjects`);
      console.log(`RAW TOTAL: ${allSubjects.length} subjects`);
      console.log(`POST-PROCESSED: ${postProcessed.subjects.length} subjects`);
      console.log(`ACTUAL ACCURACY: ${actualAccuracy.accuracy}% (${actualAccuracy.correct}/${actualAccuracy.total})`);
      console.log('═'.repeat(50));

      if (postProcessed.subjects.length === 0) {
        setLoading(false);
        Alert.alert(
          'No Subjects Found',
          isFromCamera 
            ? 'Could not find any subjects in the photo.\n\n📸 Camera Tips:\n• Hold phone steady\n• Ensure good lighting\n• Place curriculum flat\n• Fill screen with page\n• Avoid shadows/glare'
            : 'Could not find any subjects in the image.\n\nTry:\n• Taking a clearer photo\n• Ensuring better lighting\n• Capturing the entire page',
          [{ text: 'OK' }]
        );
        return;
      }

      setLoadingProgress('Saving to database...');
      await saveSubjects(postProcessed.subjects, actualAccuracy.accuracy, detectedYears, postProcessed);

    } catch (error) {
      console.error('Error processing curriculum:', error);
      setLoading(false);
      Alert.alert(
        'Processing Error',
        `Failed to process the curriculum.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\n${isFromCamera ? '📸 Camera Tip: Try retaking with better lighting and steady hands' : 'Please try again with a clearer photo.'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const saveSubjects = async (subjects: any[], accuracy: number, detectedYears: '1-2' | '3-4', postProcessed: any) => {
    try {
      if (!user?.$id) {
        console.log('❌ No user ID for saving');
        return;
      }

      console.log(`💾 Saving ${subjects.length} subjects to database...`);
      const result = await addCurriculumSubjects(user.$id, subjects);
      console.log(`✅ Successfully saved ${subjects.length} subjects!`);
      
      console.log('⏳ Waiting for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setLoading(false);

      const rateEmoji = accuracy >= 95 ? '🎉' : accuracy >= 90 ? '✓' : accuracy >= 80 ? '⚠️' : '❌';
      const yearLabel = detectedYears === '1-2' ? '1st-2nd Year' : '3rd-4th Year';
      
      const warningText = postProcessed.warnings.length > 0 
        ? `\n\n⚠️ ${postProcessed.warnings.length} potential issues detected - please review.`
        : '';
      
      Alert.alert(
        `Extraction Complete ${rateEmoji}`,
        `Detected: ${yearLabel}\nExtracted: ${subjects.length} subjects\nAccuracy: ${accuracy}%${warningText}\n\nPlease review the results in the next screen.`,
        [
          {
            text: 'Review',
            onPress: () => {
              setTimeout(() => {
                router.push('/curriculum-verify');
              }, 500);
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('❌ Error saving subjects:', error);
      Alert.alert(
        'Save Failed',
        `Extracted ${subjects.length} subjects successfully but failed to save to database.\n\nError: ${error}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Setup Curriculum</Text>
          <Text style={styles.headerSubtitle}>Step 1 of 2</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Image
            source={require('@/assets/images/curriculum.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Upload Your Curriculum</Text>
        <Text style={styles.description}>
          Take a photo or upload an image of your official BSCS curriculum checklist. We'll
          automatically detect and extract subjects with intelligent error correction.
        </Text>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📋 Tips for Best Results:</Text>
          <Text style={styles.tipText}>📸 Camera: Hold very steady, bright lighting</Text>
          <Text style={styles.tipText}>📁 Upload: Clear, high-resolution images</Text>
          <Text style={styles.tipText}>• Place paper flat on surface</Text>
          <Text style={styles.tipText}>• Capture FULL WIDTH of all tables</Text>
          <Text style={styles.tipText}>• Auto-detects years (1st-2nd or 3rd-4th)</Text>
          <Text style={styles.tipText}>• Avoid shadows, glare, and angles</Text>
        </View>

        <View style={styles.uploadArea}>
          <View style={styles.uploadIcon}>
            <Text style={styles.uploadIconText}>⬆</Text>
          </View>
          <Text style={styles.uploadTitle}>Drag & drop your file here</Text>
          <Text style={styles.uploadSubtitle}>Supports JPG, PNG</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.browseButton} onPress={handleBrowseFiles}>
              <Text style={styles.browseButtonIcon}>📁</Text>
              <Text style={styles.browseButtonText}>Browse Files</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedFile && (
          <View style={styles.filePreview}>
            <Text style={styles.filePreviewTitle}>Selected File:</Text>
            <Text style={styles.filePreviewName}>{selectedFile.name || 'Photo'}</Text>
            <Text style={styles.filePreviewNote}>
              🤖 AI-powered extraction with intelligent error correction
            </Text>
            
            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>Upload & Process with OCR</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.supportedDocs}>
          <Text style={styles.supportedDocsTitle}>SUPPORTED DOCUMENTS</Text>
          <View style={styles.docItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.docText}>Official Curriculum Checklist (Any 2 years)</Text>
          </View>
          <View style={styles.docItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.docText}>Prospectus / Study Plan</Text>
          </View>
          <View style={styles.docItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.docText}>Printed curriculum from registrar</Text>
          </View>
        </View>
      </ScrollView>

      <CurriculumLoadingModal visible={loading} progress={loadingProgress} />
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
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  iconImage: { width: 60, height: 60, tintColor: '#4ECDC4' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tipsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE99E',
  },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  tipText: { fontSize: 12, color: '#666', marginBottom: 4, lineHeight: 18 },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIconText: { fontSize: 28, color: '#4ECDC4' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  uploadSubtitle: { fontSize: 13, color: '#999', marginBottom: 20 },
  buttonContainer: { flexDirection: 'row', gap: 15, width: '100%' },
  browseButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  browseButtonIcon: { fontSize: 18 },
  browseButtonText: { fontSize: 14, color: '#4ECDC4', fontWeight: '600' },
  photoButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonIcon: { fontSize: 18 },
  photoButtonText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  filePreview: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  filePreviewTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  filePreviewName: { fontSize: 13, color: '#666', marginBottom: 5 },
  filePreviewNote: { fontSize: 12, color: '#4ECDC4', fontWeight: '500', marginBottom: 15 },
  uploadButton: { backgroundColor: '#4ECDC4', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  uploadButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  supportedDocs: { marginBottom: 40 },
  supportedDocsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkmark: { fontSize: 16, color: '#4ECDC4', marginRight: 10, fontWeight: 'bold' },
  docText: { fontSize: 14, color: '#666' },
});