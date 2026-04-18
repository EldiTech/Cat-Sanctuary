import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

type AddNewCatScreenProps = {
  onBack: () => void;
  onCatAdded: () => void;
};

const INTAKE_TYPES = ['Stray', 'Surrender', 'Transfer'];
const SEX_OPTIONS = ['Female', 'Male', 'Unknown'];
const BREED_OPTIONS = ['Puspin', 'Persian', 'Siamese', 'Other'];
const HEALTH_OPTIONS = ['Healthy', 'Recovering'];
const TEMPERAMENT_OPTIONS = [
  'Friendly',
  'Playful',
  'Shy',
  'Aggressive',
  'Calm',
  'Energetic',
  'Affectionate',
];
const MIN_TEMPERAMENTS = 2;
const MAX_BASE64_IMAGE_LENGTH = 700000;
const FIREBASE_TIMEOUT_MS = 15000;
const WIZARD_STEPS = ['Intake', 'Profile', 'Traits', 'Photo & Save'];

function generateIntakeId() {
  return 'CAT 001';
}

function todayLabel() {
  return new Date().toISOString().split('T')[0];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

export default function AddNewCatScreen({ onBack, onCatAdded }: AddNewCatScreenProps) {
  const [intakeId, setIntakeId] = useState(generateIntakeId());
  const [intakeType, setIntakeType] = useState('Stray');
  const [sex, setSex] = useState('Unknown');
  const [breedOption, setBreedOption] = useState('Puspin');
  const [customBreed, setCustomBreed] = useState('');
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [isKapon, setIsKapon] = useState(false);
  const [temperaments, setTemperaments] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const intakeDate = todayLabel();

  const refreshIntakeId = async () => {
    const snapshot = await withTimeout(
      getDocs(collection(db, 'cats')),
      FIREBASE_TIMEOUT_MS,
      'Load intake counter'
    );
    const count = String(snapshot.size + 1).padStart(3, '0');
    setIntakeId(`CAT ${count}`);
  };

  useEffect(() => {
    refreshIntakeId().catch((error) => {
      console.error('Failed to build intake ID', error);
      setIntakeId('CAT 001');
    });
  }, []);

  const resetForm = () => {
    refreshIntakeId().catch((error) => {
      console.error('Failed to refresh intake ID', error);
      setIntakeId('CAT 001');
    });
    setIntakeType('Stray');
    setSex('Unknown');
    setBreedOption('Puspin');
    setCustomBreed('');
    setHealthStatus('Healthy');
    setIsKapon(false);
    setTemperaments([]);
    setName('');
    setAge('');
    setNotes('');
    setPhotoUri('');
    setPhotoBase64('');
    setPhotoMimeType('image/jpeg');
    setCurrentStep(0);
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Missing name', 'Please enter the cat name before continuing.');
        return false;
      }

      if (breedOption === 'Other' && !customBreed.trim()) {
        Alert.alert('Specify breed', 'Please specify the breed when selecting Other.');
        return false;
      }

      return true;
    }

    if (step === 2 && temperaments.length < MIN_TEMPERAMENTS) {
      Alert.alert('Temperament required', 'Please select at least 2 temperament traits before continuing.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a cat picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets?.[0];
    if (!selected?.base64) {
      Alert.alert('Image failed', 'Could not read the selected image as base64. Please try another photo.');
      return;
    }

    if (selected.base64.length > MAX_BASE64_IMAGE_LENGTH) {
      Alert.alert('Image too large', 'Please choose a smaller image.');
      return;
    }

    setPhotoUri(selected.uri);
    setPhotoBase64(selected.base64);
    setPhotoMimeType(selected.mimeType ?? 'image/jpeg');
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a cat picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets?.[0];
    if (!selected?.base64) {
      Alert.alert('Image failed', 'Could not read the selected image as base64. Please try another photo.');
      return;
    }

    if (selected.base64.length > MAX_BASE64_IMAGE_LENGTH) {
      Alert.alert('Image too large', 'Please choose a smaller image.');
      return;
    }

    setPhotoUri(selected.uri);
    setPhotoBase64(selected.base64);
    setPhotoMimeType(selected.mimeType ?? 'image/jpeg');
  };

  const toggleTemperament = (option: string) => {
    setTemperaments((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }

      return [...current, option];
    });
  };

  const checkDuplicate = async () => {
    const nameLower = name.trim().toLowerCase();
    const normalizedBreed =
      breedOption === 'Other' ? customBreed.trim().toLowerCase() : breedOption.trim().toLowerCase();

    if (!nameLower) {
      return false;
    }

    const duplicateQuery = query(collection(db, 'cats'), where('nameLower', '==', nameLower), limit(8));
    const snapshot = await withTimeout(getDocs(duplicateQuery), FIREBASE_TIMEOUT_MS, 'Duplicate check');

    const hasCloseMatch = snapshot.docs.some((doc) => {
      const data = doc.data() as { age?: string; breed?: string };
      const ageMatch = age.trim() && data.age ? data.age.toLowerCase() === age.trim().toLowerCase() : false;
      const breedMatch = normalizedBreed && data.breed ? data.breed.toLowerCase() === normalizedBreed : false;
      return ageMatch || breedMatch || (!age.trim() && !normalizedBreed);
    });

    if (!hasCloseMatch) {
      return false;
    }

    const shouldContinue = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Possible duplicate',
        'A similar cat name already exists. Save anyway?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Save anyway', style: 'default', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      );
    });

    return !shouldContinue;
  };

  const handleSave = async () => {
    const normalizedBreed = breedOption === 'Other' ? customBreed.trim() : breedOption;

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter the cat name.');
      return;
    }

    if (breedOption === 'Other' && !customBreed.trim()) {
      Alert.alert('Specify breed', 'Please specify the breed when selecting Other.');
      return;
    }

    if (temperaments.length < MIN_TEMPERAMENTS) {
      Alert.alert('Temperament required', 'Please select at least 2 temperament traits.');
      return;
    }

    setSaving(true);

    try {
      if (!intakeId.startsWith('CAT ')) {
        await refreshIntakeId();
      }

      const shouldStopForDuplicate = await checkDuplicate();
      if (shouldStopForDuplicate) {
        setSaving(false);
        return;
      }

      await withTimeout(
        addDoc(collection(db, 'cats'), {
          intakeId,
          intakeType,
          status: 'New Intake',
          intakeDate,
          name: name.trim(),
          nameLower: name.trim().toLowerCase(),
          sex,
          healthStatus,
          isKapon,
          temperament: temperaments,
          temperamentSummary: temperaments.join(', '),
          age: age.trim(),
          breed: normalizedBreed,
          notes: notes.trim(),
          photoBase64,
          photoMimeType,
          createdAt: serverTimestamp(),
        }),
        FIREBASE_TIMEOUT_MS,
        'Save cat profile'
      );

      if (notes.trim()) {
        await withTimeout(
          addDoc(collection(db, 'notifications'), {
            type: 'note',
            catName: name.trim(),
            intakeId,
            message: `New note added for ${name.trim()}.`,
            createdAt: serverTimestamp(),
          }),
          FIREBASE_TIMEOUT_MS,
          'Save note notification'
        );
      }

      resetForm();
      Alert.alert('Saved', 'Cat profile added to your shelter.');
      onCatAdded();
    } catch (error) {
      console.error('Failed to save cat', error);
      const message = error instanceof Error && error.message.includes('timed out')
        ? 'Request timed out. Please check your internet and Firestore rules, then try again.'
        : 'Could not save this cat right now. Please try again.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF7F2', '#FFE6DB', '#FDEDD8', '#FFF8EF']}
        style={styles.gradient}
        start={{ x: 0, y: 0.05 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.ambientOrbTop} />
        <View style={styles.ambientOrbBottom} />

        <View style={styles.headerRow}>
          <View style={styles.demoLogoBadge}>
            <Text style={styles.demoLogoText}>DEMO</Text>
          </View>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>CAT SANCTUARY</Text>
          <Text style={styles.title}>Add a New Cat</Text>
          <Text style={styles.caption}>Create a front-desk intake profile for a new resident.</Text>

          <View style={styles.formCard}>
            <View style={styles.stepperRow}>
              {WIZARD_STEPS.map((step, index) => (
                <View key={step} style={styles.stepperItem}>
                  <View
                    style={[
                      styles.stepperDot,
                      index <= currentStep && styles.stepperDotActive,
                      index === currentStep && styles.stepperDotCurrent,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepperLabel,
                      index <= currentStep && styles.stepperLabelActive,
                      index === currentStep && styles.stepperLabelCurrent,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {currentStep === 0 && (
              <>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>Intake ID</Text>
                    <Text style={styles.metaValue}>{intakeId}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <Text style={styles.metaValue}>New Intake</Text>
                  </View>
                </View>

                <View style={styles.metaRowSingle}>
                  <View style={styles.metaPillWide}>
                    <Text style={styles.metaLabel}>Intake Date</Text>
                    <Text style={styles.metaValue}>{intakeDate}</Text>
                  </View>
                </View>

                <Text style={styles.label}>Intake Type</Text>
                <View style={styles.chipsRow}>
                  {INTAKE_TYPES.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setIntakeType(option)}
                      style={[styles.chip, intakeType === option && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, intakeType === option && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {currentStep === 1 && (
              <>
                <Text style={styles.label}>Cat Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Mochi"
                  placeholderTextColor="#AF7B88"
                  style={styles.input}
                />

                <Text style={styles.label}>Age</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="2 years"
                  placeholderTextColor="#AF7B88"
                  style={styles.input}
                />

                <Text style={styles.label}>Breed</Text>
                <View style={styles.chipsRow}>
                  {BREED_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setBreedOption(option)}
                      style={[styles.chip, breedOption === option && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, breedOption === option && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
                {breedOption === 'Other' && (
                  <TextInput
                    value={customBreed}
                    onChangeText={setCustomBreed}
                    placeholder="Specify Breed"
                    placeholderTextColor="#AF7B88"
                    style={[styles.input, styles.inputTopSpacing]}
                  />
                )}

                <Text style={styles.label}>Health Status</Text>
                <View style={styles.chipsRow}>
                  {HEALTH_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setHealthStatus(option)}
                      style={[styles.chip, healthStatus === option && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, healthStatus === option && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Kapon Status</Text>
                <Text style={styles.helpText}>Spayed/Neutered</Text>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => setIsKapon((prev) => !prev)}
                    style={[styles.chip, isKapon && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isKapon && styles.chipTextActive]}>
                      {isKapon ? 'Kapon On' : 'Kapon'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {currentStep === 2 && (
              <>
                <Text style={styles.label}>Sex</Text>
                <View style={styles.chipsRow}>
                  {SEX_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setSex(option)}
                      style={[styles.chip, sex === option && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, sex === option && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Temperament</Text>
                <Text style={styles.helpText}>Select 2 or more traits that best describe the pet.</Text>
                <View style={styles.chipsRow}>
                  {TEMPERAMENT_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => toggleTemperament(option)}
                      style={[styles.chip, temperaments.includes(option) && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, temperaments.includes(option) && styles.chipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Temperament, medical notes, feeding details"
                  placeholderTextColor="#AF7B88"
                  style={[styles.input, styles.notesInput]}
                  multiline
                  textAlignVertical="top"
                />
              </>
            )}

            {currentStep === 3 && (
              <>
                <Text style={styles.label}>Photo</Text>
                <Text style={styles.helpText}>Upload or take one square photo.</Text>

                <View style={styles.photoPanel}>
                  <View style={styles.photoActionsRow}>
                    <Pressable style={[styles.photoButton, styles.photoActionPrimary]} onPress={handleTakePhoto}>
                      <Text style={styles.photoButtonLabel}>Take Photo</Text>
                    </Pressable>
                    <Pressable style={[styles.photoButton, styles.photoActionPrimary]} onPress={handlePickPhoto}>
                      <Text style={styles.photoButtonLabel}>{photoBase64 ? 'Change Photo' : 'Upload Photo'}</Text>
                    </Pressable>
                    {photoBase64 ? (
                      <Pressable
                        style={[styles.photoButton, styles.photoActionPrimary, styles.photoRemoveButton]}
                        onPress={() => {
                          setPhotoUri('');
                          setPhotoBase64('');
                          setPhotoMimeType('image/jpeg');
                        }}
                      >
                        <Text style={styles.photoRemoveButtonLabel}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {photoUri ? (
                    <View style={styles.photoPreviewWrap}>
                      <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    </View>
                  ) : (
                    <View style={styles.photoEmptyState}>
                      <Text style={styles.photoEmptyStateText}>No photo selected yet</Text>
                    </View>
                  )}
                </View>

                <View style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>Quick Review</Text>

                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Intake</Text>
                    <Text style={styles.reviewLine}>ID: {intakeId}</Text>
                    <Text style={styles.reviewLine}>Type: {intakeType}</Text>
                    <Text style={styles.reviewLine}>Date: {intakeDate}</Text>
                  </View>

                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Profile</Text>
                    <Text style={styles.reviewLine}>Name: {name || 'Not set'}</Text>
                    <Text style={styles.reviewLine}>
                      Breed: {breedOption === 'Other' ? customBreed || 'Not set' : breedOption}
                    </Text>
                    <Text style={styles.reviewLine}>Age: {age || 'Not set'}</Text>
                    <Text style={styles.reviewLine}>Health: {healthStatus}</Text>
                    <Text style={styles.reviewLine}>Kapon: {isKapon ? 'Yes' : 'No'}</Text>
                  </View>

                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Traits</Text>
                    <Text style={styles.reviewLine}>Sex: {sex}</Text>
                    <View style={styles.reviewTagsRow}>
                      {temperaments.length > 0 ? (
                        temperaments.map((item) => (
                          <View key={item} style={styles.reviewTag}>
                            <Text style={styles.reviewTagText}>{item}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.reviewLine}>No temperament selected</Text>
                      )}
                    </View>
                    <Text style={styles.reviewLine}>Notes: {notes.trim() ? notes.trim() : 'No notes'}</Text>
                  </View>

                  <View style={styles.reviewStatusRow}>
                    <View style={[styles.reviewStatusPill, photoBase64 ? styles.reviewStatusPillOk : styles.reviewStatusPillWarn]}>
                      <Text style={[styles.reviewStatusText, photoBase64 ? styles.reviewStatusTextOk : styles.reviewStatusTextWarn]}>
                        {photoBase64 ? 'Photo attached' : 'No photo attached'}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <View style={styles.wizardActions}>
              {currentStep > 0 ? (
                <Pressable style={[styles.wizardButton, styles.wizardButtonSecondary]} onPress={handlePreviousStep}>
                  <Text style={styles.wizardButtonSecondaryLabel}>Back</Text>
                </Pressable>
              ) : (
                <View style={styles.wizardButtonSpacer} />
              )}

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Pressable style={styles.wizardButton} onPress={handleNextStep}>
                  <Text style={styles.wizardButtonLabel}>Next</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFF7F2" />
                  ) : (
                    <Text style={styles.saveButtonLabel}>Save Cat Profile</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF7F2',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  ambientOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(231, 141, 118, 0.24)',
    top: -88,
    right: -74,
  },
  ambientOrbBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    bottom: -72,
    left: -64,
  },
  headerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoLogoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(115, 6, 34, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 247, 242, 0.7)',
  },
  demoLogoText: {
    color: '#FFF7F2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
  },
  backButtonLabel: {
    color: '#730622',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    paddingTop: 22,
    paddingBottom: 30,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B4D5F',
    letterSpacing: 2,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '800',
    color: '#730622',
    letterSpacing: 0.2,
  },
  caption: {
    marginTop: 8,
    fontSize: 14,
    color: '#8A4353',
    lineHeight: 21,
    maxWidth: 330,
  },
  formCard: {
    marginTop: 18,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepperItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepperDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(155, 77, 95, 0.28)',
    marginBottom: 6,
  },
  stepperDotActive: {
    backgroundColor: '#9B4D5F',
  },
  stepperDotCurrent: {
    width: 12,
    height: 12,
    backgroundColor: '#730622',
  },
  stepperLabel: {
    color: '#A46B78',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepperLabelActive: {
    color: '#8A4353',
  },
  stepperLabelCurrent: {
    color: '#730622',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaRowSingle: {
    marginTop: 10,
  },
  metaPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF9F5',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.18)',
  },
  metaPillWide: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF9F5',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.18)',
  },
  metaLabel: {
    fontSize: 11,
    color: '#9B4D5F',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaValue: {
    marginTop: 4,
    fontSize: 13,
    color: '#6F2F41',
    fontWeight: '700',
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#730622',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    borderRadius: 14,
    backgroundColor: '#FFF9F5',
    color: '#6F2F41',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputTopSpacing: {
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helpText: {
    marginTop: -2,
    marginBottom: 8,
    color: '#9B4D5F',
    fontSize: 12,
    fontWeight: '600',
  },
  photoPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.16)',
    backgroundColor: '#FFFBF8',
    padding: 12,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  photoActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.24)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  photoActionPrimary: {
    minWidth: 96,
    flexGrow: 1,
    flexBasis: 0,
    alignItems: 'center',
  },
  photoButtonLabel: {
    color: '#8A4353',
    fontSize: 13,
    fontWeight: '700',
  },
  photoRemoveButton: {
    borderColor: 'rgba(160, 61, 81, 0.35)',
    backgroundColor: '#FFF1EC',
  },
  photoRemoveButtonLabel: {
    color: '#8F3C4F',
    fontSize: 13,
    fontWeight: '700',
  },
  photoPreviewWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  photoPreview: {
    width: 152,
    height: 152,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.24)',
  },
  photoEmptyState: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(155, 77, 95, 0.2)',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyStateText: {
    color: '#9B4D5F',
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.24)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: '#730622',
    borderColor: '#730622',
  },
  chipText: {
    color: '#8A4353',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFF7F2',
  },
  notesInput: {
    minHeight: 96,
  },
  saveButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#730622',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonLabel: {
    color: '#FFF7F2',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  reviewCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  reviewTitle: {
    color: '#730622',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  reviewSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(155, 77, 95, 0.12)',
  },
  reviewSectionTitle: {
    color: '#7A2D40',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  reviewLine: {
    color: '#8A4353',
    fontSize: 12,
    marginBottom: 2,
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  reviewTag: {
    borderRadius: 999,
    backgroundColor: '#F9E8E1',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewTagText: {
    color: '#8A4353',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewStatusRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  reviewStatusPill: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  reviewStatusPillOk: {
    backgroundColor: '#E9F8EF',
    borderColor: 'rgba(42, 139, 82, 0.35)',
  },
  reviewStatusPillWarn: {
    backgroundColor: '#FFF2EC',
    borderColor: 'rgba(155, 77, 95, 0.25)',
  },
  reviewStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewStatusTextOk: {
    color: '#1E7A47',
  },
  reviewStatusTextWarn: {
    color: '#8A4353',
  },
  wizardActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  wizardButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#730622',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  wizardButtonSecondary: {
    backgroundColor: '#FFF2EC',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
  },
  wizardButtonLabel: {
    color: '#FFF7F2',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wizardButtonSecondaryLabel: {
    color: '#8A4353',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wizardButtonSpacer: {
    flex: 1,
  },
});
