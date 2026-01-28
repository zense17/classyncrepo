import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function ScanCOR() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for guide box
  useState(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  });

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="camera-outline" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan your Certificate of Registration (COR)
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          skipProcessing: false,
        });

        if (photo?.uri) {
          router.push({
            pathname: "/(import)/loading",
            params: { uri: photo.uri }
          });
        }
      } catch (error) {
        console.error("Failed to take picture:", error);
        Alert.alert(
          "Capture Error", 
          "Failed to capture image. Please try again.",
          [{ text: "OK", style: "default" }]
        );
        setIsProcessing(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView 
        style={StyleSheet.absoluteFill} 
        facing="back" 
        ref={cameraRef}
      />
        
      {/* Dark Overlay for focus effect */}
      <View style={styles.darkOverlay} pointerEvents="none" />

      {/* UI Overlay */}
      <SafeAreaView style={styles.overlay}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerText}>Scan COR</Text>
            <Text style={styles.headerSubtext}>Certificate of Registration</Text>
          </View>
          
          <View style={{ width: 44 }} /> 
        </View>

        {/* Guide Container */}
        <View style={styles.guideContainer}>
          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>
              Position your COR within the frame
            </Text>
          </View>

          {/* Animated Guide Box */}
          <Animated.View 
            style={[
              styles.guideBox,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            {/* Corner Brackets */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            
            {/* Center Crosshair */}
            <View style={styles.crosshair}>
              <View style={styles.crosshairHorizontal} />
              <View style={styles.crosshairVertical} />
            </View>
          </Animated.View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tip}>
              <Ionicons name="sunny-outline" size={16} color="#FFF" />
              <Text style={styles.tipText}>Good lighting</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="document-text-outline" size={16} color="#FFF" />
              <Text style={styles.tipText}>Flat surface</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="eye-outline" size={16} color="#FFF" />
              <Text style={styles.tipText}>Clear & readable</Text>
            </View>
          </View>
        </View>

        {/* Footer / Controls */}
        <View style={styles.footer}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#20C997" />
              <Text style={styles.processingText}>Processing image...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.captureHint}>Tap to capture</Text>
              <TouchableOpacity 
                style={styles.captureBtnOuter} 
                onPress={takePicture}
                activeOpacity={0.8}
              >
                <View style={styles.captureBtnInner}>
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.uiBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.title,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  guideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 40,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: `rgba(78, 195, 195, 0.3)`, // Colors.primary with opacity
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  guideBox: {
    width: '82%',
    aspectRatio: 1.4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: Colors.primary,
    borderWidth: 5,
  },
  tl: { 
    top: -3, 
    left: -3, 
    borderRightWidth: 0, 
    borderBottomWidth: 0, 
    borderTopLeftRadius: 24 
  },
  tr: { 
    top: -3, 
    right: -3, 
    borderLeftWidth: 0, 
    borderBottomWidth: 0, 
    borderTopRightRadius: 24 
  },
  bl: { 
    bottom: -3, 
    left: -3, 
    borderRightWidth: 0, 
    borderTopWidth: 0, 
    borderBottomLeftRadius: 24 
  },
  br: { 
    bottom: -3, 
    right: -3, 
    borderLeftWidth: 0, 
    borderTopWidth: 0, 
    borderBottomRightRadius: 24 
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: `rgba(78, 195, 195, 0.6)`, // Colors.primary with opacity
    top: 19,
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: `rgba(78, 195, 195, 0.6)`, // Colors.primary with opacity
    left: 19,
  },
  tipsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  captureBtnOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureBtnInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});