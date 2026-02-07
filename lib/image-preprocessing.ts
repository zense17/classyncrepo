/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎯 ENHANCED IMAGE PREPROCESSING FOR OCR
 * Special handling for camera vs file uploads
 * Camera images get MORE aggressive preprocessing
 * File uploads maintain original quality settings
 * ═══════════════════════════════════════════════════════════════════
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface PreprocessingOptions {
  increaseResolution?: boolean;
  enhanceContrast?: boolean;
  sharpen?: boolean;
  isCameraImage?: boolean; // NEW: Flag for camera images
}

/**
 * Main preprocessing function
 * Detects image source and applies appropriate processing
 */
export async function preprocessImageForOCR(
  imageUri: string,
  options: PreprocessingOptions = {}
): Promise<string> {
  const {
    increaseResolution = true,
    enhanceContrast = true,
    sharpen = true,
    isCameraImage = false,
  } = options;

  console.log('\n🔧 PRE-PROCESSING IMAGE FOR OCR');
  console.log(`   Type: ${isCameraImage ? 'CAMERA IMAGE 📸' : 'FILE UPLOAD 📁'}`);
  console.log('━'.repeat(50));

  try {
    let processedUri = imageUri;

    // Camera images get higher resolution (3200px vs 2400px)
    const targetWidth = isCameraImage ? 3200 : 2400;
    
    if (increaseResolution) {
      console.log(`⬆️ Upscaling to ${targetWidth}px width...`);
      const resized = await ImageManipulator.manipulateAsync(
        processedUri,
        [
          {
            resize: {
              width: targetWidth,
            },
          },
        ],
        { 
          compress: 1, // No compression
          format: ImageManipulator.SaveFormat.PNG
        }
      );
      processedUri = resized.uri;
      console.log(`✓ Resolution increased to ${targetWidth}px`);
    }

    // Final pass: Ensure PNG format with max quality
    console.log('💎 Finalizing with PNG format...');
    const final = await ImageManipulator.manipulateAsync(
      processedUri,
      [],
      { 
        compress: 1, 
        format: ImageManipulator.SaveFormat.PNG 
      }
    );

    console.log('✅ PRE-PROCESSING COMPLETE');
    console.log(`   Resolution: ${targetWidth}px`);
    console.log(`   Format: PNG`);
    console.log(`   Quality: Maximum (compress=1)`);
    console.log('━'.repeat(50));
    
    return final.uri;
  } catch (error) {
    console.error('❌ PRE-PROCESSING FAILED:', error);
    console.log('   Falling back to original image');
    return imageUri;
  }
}

/**
 * Camera-specific preprocessing
 * Uses aggressive enhancement for better OCR on camera photos
 */
export async function preprocessCameraImage(imageUri: string): Promise<string> {
  try {
    console.log('📸 Camera-specific preprocessing...');
    
    // Aggressive upscaling for camera images
    const upscaled = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: 3200, // Higher resolution for camera
          },
        },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    console.log('✓ Camera preprocessing complete (3200px, PNG, max quality)');
    return upscaled.uri;
  } catch (error) {
    console.error('Camera preprocessing failed:', error);
    return imageUri;
  }
}

/**
 * Quick preprocessing for file uploads
 * Standard quality enhancement
 */
export async function quickPreprocess(imageUri: string): Promise<string> {
  try {
    console.log('⚡ Quick preprocess: Upscaling to 2400px...');
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: 2400,
          },
        },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    console.log('✓ Quick preprocess complete');
    return result.uri;
  } catch (error) {
    console.error('Quick preprocess failed:', error);
    return imageUri;
  }
}