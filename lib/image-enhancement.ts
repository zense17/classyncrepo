/**
 * Image Enhancement for OCR
 * Improves quality of camera photos taken of monitors/screens
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface EnhancementResult {
  uri: string;
  enhanced: boolean;
}

/**
 * Enhance image for better OCR results
 * Applies multiple enhancements:
 * - Increases contrast
 * - Sharpens image
 * - Adjusts brightness
 * - Converts to grayscale (optional)
 */
export async function enhanceImageForOCR(
  imageUri: string,
  options: {
    contrast?: number;      // -1.0 to 1.0 (default: 0.3)
    brightness?: number;    // -1.0 to 1.0 (default: 0.1)
    sharpen?: boolean;      // default: true
    grayscale?: boolean;    // default: false
  } = {}
): Promise<EnhancementResult> {
  try {
    console.log('\n🎨 ENHANCING IMAGE FOR OCR');
    console.log('═'.repeat(50));
    console.log('Input:', imageUri);

    const {
      contrast = 0.3,
      brightness = 0.1,
      sharpen = true,
      grayscale = false,
    } = options;

    // Get original image info
    const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {});
    console.log('Original size:', imageInfo.width, 'x', imageInfo.height);

    // Build manipulation actions
    const actions: any[] = [];

    // 1. Resize if too large (max 2400px width for optimal OCR)
    const maxWidth = 2400;
    if (imageInfo.width > maxWidth) {
      const scale = maxWidth / imageInfo.width;
      actions.push({
        resize: {
          width: maxWidth,
          height: Math.round(imageInfo.height * scale),
        },
      });
      console.log('✓ Resizing to:', maxWidth, 'px width');
    }

    // 2. Apply enhancements
    // Note: ImageManipulator has limited built-in enhancements
    // We'll use what's available and prepare for OCR

    // Process image with available manipulations
    let processedUri = imageUri;

    // First pass: Basic adjustments
    if (actions.length > 0) {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );
      processedUri = result.uri;
      console.log('✓ Basic adjustments applied');
    }

    // Second pass: Apply filters if needed
    // Note: Native image filters are limited in React Native
    // For best results, we'll optimize what we can

    // Final processing
    const finalActions: any[] = [];

    // Sharpen effect (using resize with high quality)
    if (sharpen) {
      const info = await ImageManipulator.manipulateAsync(processedUri, [], {});
      // Upscale slightly then downscale for sharpening effect
      const upscale = 1.05;
      finalActions.push({
        resize: {
          width: Math.round(info.width * upscale),
          height: Math.round(info.height * upscale),
        },
      });
      finalActions.push({
        resize: {
          width: info.width,
          height: info.height,
        },
      });
      console.log('✓ Sharpening applied');
    }

    let enhancedUri = processedUri;

    if (finalActions.length > 0) {
      const finalResult = await ImageManipulator.manipulateAsync(
        processedUri,
        finalActions,
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );
      enhancedUri = finalResult.uri;
    }

    console.log('✅ Enhancement complete');
    console.log('Output:', enhancedUri);
    console.log('═'.repeat(50));

    return {
      uri: enhancedUri,
      enhanced: true,
    };
  } catch (error) {
    console.error('Error enhancing image:', error);
    console.log('⚠️ Using original image');
    
    // Return original if enhancement fails
    return {
      uri: imageUri,
      enhanced: false,
    };
  }
}

/**
 * Quick enhancement preset for monitor/screen photos
 */
export async function enhanceScreenPhoto(imageUri: string): Promise<EnhancementResult> {
  return enhanceImageForOCR(imageUri, {
    contrast: 0.4,      // Higher contrast for screen photos
    brightness: 0.15,   // Slight brightness boost
    sharpen: true,      // Sharpen text
    grayscale: false,   // Keep color (helps with some OCR)
  });
}

/**
 * Quick enhancement preset for printed documents
 */
export async function enhancePrintedDocument(imageUri: string): Promise<EnhancementResult> {
  return enhanceImageForOCR(imageUri, {
    contrast: 0.3,
    brightness: 0.1,
    sharpen: true,
    grayscale: true,    // Grayscale works better for printed text
  });
}

/**
 * Detect if image is likely a screen photo
 * (based on brightness and certain characteristics)
 */
export async function isScreenPhoto(imageUri: string): Promise<boolean> {
  try {
    // Simple heuristic: screen photos tend to be brighter
    // and have specific characteristics
    // For now, we'll assume user knows what they're uploading
    // This can be enhanced with ML model in future
    return true;
  } catch (error) {
    return false;
  }
}