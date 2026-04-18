import { LinearGradient } from 'expo-linear-gradient';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

type ManageCatsScreenProps = {
  onBack: () => void;
};

type CatRecord = {
  id: string;
  intakeId: string;
  intakeType: string;
  status: string;
  intakeDate: string;
  name: string;
  sex: string;
  healthStatus: string;
  isKapon: boolean;
  temperament: string[];
  age: string;
  breed: string;
  notes: string;
  photoBase64: string;
  photoMimeType?: string;
  room?: string;
  assignedRoom?: string;
  createdAt?: Timestamp;
};

type EditFormState = {
  intakeId: string;
  intakeType: string;
  status: string;
  intakeDate: string;
  name: string;
  sex: string;
  healthStatus: string;
  isKapon: boolean;
  temperament: string[];
  age: string;
  breed: string;
};

const INTAKE_TYPES = ['Stray', 'Surrender', 'Transfer'];
const SEX_OPTIONS = ['Female', 'Male', 'Unknown'];
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

type FilterKey = 'all' | 'pinned' | 'withNotes';

type NoticeState = {
  title: string;
  message: string;
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
};

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'withNotes', label: 'With Notes' },
];

const SHELTER_ROOM_OPTIONS = ['Puspin Rooms', 'Interaction Room', 'Recovery Room'];

function normalizeRoomLabel(value?: string) {
  const roomValue = String(value ?? '').trim();
  if (!roomValue) {
    return '';
  }

  const normalized = roomValue.toLowerCase();
  if (normalized.includes('interaction')) {
    return 'Interaction Room';
  }

  if (normalized.includes('recovery')) {
    return 'Recovery Room';
  }

  if (normalized.includes('puspin')) {
    return 'Puspin Rooms';
  }

  return roomValue;
}

export default function ManageCatsScreen({ onBack }: ManageCatsScreenProps) {
  const [cats, setCats] = useState<CatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCat, setViewingCat] = useState<CatRecord | null>(null);
  const [editingCat, setEditingCat] = useState<CatRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [noteCat, setNoteCat] = useState<CatRecord | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [assigningCat, setAssigningCat] = useState<CatRecord | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    const catsQuery = query(collection(db, 'cats'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      catsQuery,
      (snapshot) => {
        const nextCats = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<CatRecord, 'id'>;
          return {
            id: doc.id,
            intakeId: data.intakeId ?? 'CAT 001',
            intakeType: data.intakeType ?? 'Stray',
            status: data.status ?? 'New Intake',
            intakeDate: data.intakeDate ?? '',
            name: data.name ?? 'Unnamed cat',
            sex: data.sex ?? 'Unknown',
            healthStatus: data.healthStatus ?? 'Healthy',
            isKapon: Boolean(data.isKapon),
            temperament: Array.isArray(data.temperament) ? data.temperament : [],
            age: data.age ?? '',
            breed: data.breed ?? '',
            notes: data.notes ?? '',
            photoBase64: data.photoBase64 ?? '',
            photoMimeType: data.photoMimeType ?? 'image/jpeg',
            room: data.room,
            assignedRoom: data.assignedRoom,
            createdAt: data.createdAt,
          };
        });

        setCats(nextCats);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load cats', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const totalLabel = useMemo(() => `${cats.length} cat${cats.length === 1 ? '' : 's'}`, [cats.length]);

  const visibleCats = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredByType = cats.filter((cat) => {
      if (activeFilter === 'pinned') {
        return pinnedIds.includes(cat.id);
      }

      if (activeFilter === 'withNotes') {
        return Boolean(cat.notes.trim());
      }

      return true;
    });

    if (!normalizedSearch) {
      return filteredByType;
    }

    return filteredByType.filter((cat) => {
      const haystack = `${cat.name} ${cat.notes} ${cat.breed} ${cat.intakeId} ${cat.intakeType}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeFilter, cats, pinnedIds, searchQuery]);

  const clearNotificationsByType = async (intakeId: string, type: 'note' | 'pin') => {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('intakeId', '==', intakeId),
      where('type', '==', type)
    );
    const snapshot = await getDocs(notificationsQuery);
    await Promise.all(snapshot.docs.map((notificationDoc) => deleteDoc(notificationDoc.ref)));
  };

  const clearAllNotificationsByIntake = async (intakeId: string) => {
    const notificationsQuery = query(collection(db, 'notifications'), where('intakeId', '==', intakeId));
    const snapshot = await getDocs(notificationsQuery);
    await Promise.all(snapshot.docs.map((notificationDoc) => deleteDoc(notificationDoc.ref)));
  };

  const showNotice = (title: string, message: string) => {
    setNotice({ title, message });
  };

  const openConfirmDialog = (dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  };

  const handleConfirmDialog = async () => {
    if (!confirmDialog) {
      return;
    }

    const runConfirm = confirmDialog.onConfirm;

    setConfirmBusy(true);
    try {
      await runConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const togglePin = async (cat: CatRecord) => {
    const currentlyPinned = pinnedIds.includes(cat.id);

    setPinnedIds((current) =>
      currentlyPinned ? current.filter((id) => id !== cat.id) : [...current, cat.id]
    );

    try {
      if (currentlyPinned) {
        await clearNotificationsByType(cat.intakeId.trim(), 'pin');
        return;
      }

      await addDoc(collection(db, 'notifications'), {
        type: 'pin',
        catName: cat.name.trim(),
        intakeId: cat.intakeId.trim(),
        message: `${cat.name.trim()} was pinned for quick access.`,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to update pin alerts', error);
    }
  };

  const handleOpenEdit = (cat: CatRecord) => {
    setEditingCat(cat);
    setEditForm({
      intakeId: cat.intakeId,
      intakeType: cat.intakeType,
      status: cat.status,
      intakeDate: cat.intakeDate,
      name: cat.name,
      sex: cat.sex,
      healthStatus: cat.healthStatus,
      isKapon: cat.isKapon,
      temperament: [...cat.temperament],
      age: cat.age,
      breed: cat.breed,
    });
  };

  const handleOpenNote = (cat: CatRecord) => {
    setNoteCat(cat);
    setNoteText(cat.notes);
  };

  const toggleEditTemperament = (option: string) => {
    if (!editForm) {
      return;
    }

    const nextTemperament = editForm.temperament.includes(option)
      ? editForm.temperament.filter((item) => item !== option)
      : [...editForm.temperament, option];

    setEditForm({ ...editForm, temperament: nextTemperament });
  };

  const handleSaveEdit = async () => {
    if (!editingCat) {
      return;
    }

    if (!editForm) {
      return;
    }

    if (!editForm.name.trim()) {
      showNotice('Missing name', 'Please enter a name before saving changes.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'cats', editingCat.id), {
        intakeId: editForm.intakeId.trim(),
        intakeType: editForm.intakeType,
        status: editForm.status.trim() || 'New Intake',
        intakeDate: editForm.intakeDate.trim(),
        name: editForm.name.trim(),
        nameLower: editForm.name.trim().toLowerCase(),
        sex: editForm.sex,
        healthStatus: editForm.healthStatus,
        isKapon: editForm.isKapon,
        temperament: editForm.temperament,
        temperamentSummary: editForm.temperament.join(', '),
        age: editForm.age.trim(),
        breed: editForm.breed.trim(),
      });

      setEditingCat(null);
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update cat', error);
      showNotice('Save failed', 'Could not update this cat right now. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteCat) {
      return;
    }

    const previousNote = noteCat.notes.trim();
    const nextNote = noteText.trim();
    const shouldCreateNoteNotification = nextNote.length > 0 && nextNote !== previousNote;
    const shouldClearNoteNotifications = previousNote.length > 0 && nextNote.length === 0;

    setSavingNote(true);
    try {
      await updateDoc(doc(db, 'cats', noteCat.id), {
        notes: nextNote,
      });

      if (shouldCreateNoteNotification) {
        await addDoc(collection(db, 'notifications'), {
          type: 'note',
          catName: noteCat.name.trim(),
          intakeId: noteCat.intakeId.trim(),
          message: `New note added for ${noteCat.name.trim()}.`,
          createdAt: serverTimestamp(),
        });
      }

      if (shouldClearNoteNotifications) {
        await clearNotificationsByType(noteCat.intakeId.trim(), 'note');
      }

      setNoteCat(null);
      setNoteText('');
    } catch (error) {
      console.error('Failed to save note', error);
      showNotice('Save failed', 'Could not save this note right now. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleClearNote = async () => {
    if (!noteCat) {
      return;
    }

    const targetCat = noteCat;

    const hasNote = noteCat.notes.trim().length > 0 || noteText.trim().length > 0;
    if (!hasNote) {
      setNoteCat(null);
      setNoteText('');
      return;
    }

    openConfirmDialog({
      title: 'Clear note',
      message: `Remove note for ${targetCat.name}?`,
      confirmLabel: 'Clear',
      isDestructive: true,
      onConfirm: async () => {
        setSavingNote(true);
        try {
          await updateDoc(doc(db, 'cats', targetCat.id), { notes: '' });
          await clearNotificationsByType(targetCat.intakeId.trim(), 'note');
          setNoteCat(null);
          setNoteText('');
        } catch (error) {
          console.error('Failed to clear note', error);
          showNotice('Clear failed', 'Could not clear this note right now. Please try again.');
        } finally {
          setSavingNote(false);
        }
      },
    });
  };

  const handleAssignToShelter = async (selectedRoom: string) => {
    if (!assigningCat) {
      return;
    }

    const cat = assigningCat;

    setSavingAssignment(true);
    try {
      await updateDoc(doc(db, 'cats', cat.id), {
        status: 'Assigned to Shelter',
        room: selectedRoom,
        assignedRoom: selectedRoom,
      });

      await addDoc(collection(db, 'notifications'), {
        type: 'assignment',
        catName: cat.name.trim(),
        intakeId: cat.intakeId.trim(),
        room: selectedRoom,
        message: `${cat.name.trim()} is assigned to ${selectedRoom}.`,
        createdAt: serverTimestamp(),
      });

      setAssigningCat(null);
    } catch (error) {
      console.error('Failed to assign cat', error);
      showNotice('Assign failed', 'Could not assign this cat right now. Please try again.');
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteCat = (cat: CatRecord) => {
    openConfirmDialog({
      title: 'Delete cat',
      message: `Delete ${cat.name} from records?`,
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'cats', cat.id));
          await clearAllNotificationsByIntake(cat.intakeId.trim());
          setPinnedIds((current) => current.filter((id) => id !== cat.id));
        } catch (error) {
          console.error('Failed to delete cat', error);
          showNotice('Delete failed', 'Could not delete this cat right now. Please try again.');
        }
      },
    });
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

        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>CAT SANCTUARY</Text>
          <Text style={styles.title}>Manage Cats</Text>
          <Text style={styles.caption}>Total residents: {totalLabel}.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#730622" />
            <Text style={styles.loadingText}>Loading cat profiles...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.searchWrap}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or note"
                placeholderTextColor="#AF7B88"
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((filter) => (
                <Pressable
                  key={filter.key}
                  style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text
                    style={[styles.filterChipText, activeFilter === filter.key && styles.filterChipTextActive]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {visibleCats.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No cats to show</Text>
                <Text style={styles.emptyText}>Try another filter or add a new cat profile.</Text>
              </View>
            ) : (
              visibleCats.map((cat) => {
                const roomLabel = normalizeRoomLabel(cat.assignedRoom ?? cat.room);

                return (
                  <View key={cat.id} style={styles.catCard}>
                    {cat.photoBase64 ? (
                      <Image
                        source={{ uri: `data:${cat.photoMimeType ?? 'image/jpeg'};base64,${cat.photoBase64}` }}
                        style={styles.catPhoto}
                      />
                    ) : (
                      <View style={styles.catPhotoFallback}>
                        <Text style={styles.catPhotoFallbackText}>No Photo</Text>
                      </View>
                    )}

                    <View style={styles.catMainInfo}>
                      <Text style={styles.catName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {roomLabel ? (
                        <View style={styles.roomBadge}>
                          <Text style={styles.roomBadgeText}>{roomLabel}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.actionGrid}>
                      <Pressable style={styles.actionButton} onPress={() => setViewingCat(cat)}>
                        <Text style={styles.actionButtonText}>View</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => handleOpenEdit(cat)}>
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => handleOpenNote(cat)}>
                        <Text style={styles.actionButtonText}>Note</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => togglePin(cat)}
                        style={[styles.actionButton, pinnedIds.includes(cat.id) && styles.pinActionButtonActive]}
                      >
                        <Text style={[styles.actionButtonText, pinnedIds.includes(cat.id) && styles.pinActionButtonTextActive]}>
                          {pinnedIds.includes(cat.id) ? 'Pinned' : 'Pin'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => setAssigningCat(cat)}>
                        <Text style={styles.actionButtonText}>Assign</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, styles.actionDangerButton]} onPress={() => handleDeleteCat(cat)}>
                        <Text style={[styles.actionButtonText, styles.actionDangerButtonText]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <Modal visible={Boolean(viewingCat)} transparent animationType="fade" onRequestClose={() => setViewingCat(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardLarge}>
              <Text style={styles.modalTitle}>Cat Profile</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {viewingCat?.photoBase64 ? (
                  <Image
                    source={{
                      uri: `data:${viewingCat.photoMimeType ?? 'image/jpeg'};base64,${viewingCat.photoBase64}`,
                    }}
                    style={styles.modalPhoto}
                  />
                ) : (
                  <View style={styles.modalPhotoFallback}>
                    <Text style={styles.catPhotoFallbackText}>No Photo</Text>
                  </View>
                )}

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Intake ID</Text>
                  <Text style={styles.infoValue}>{viewingCat?.intakeId || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Intake Type</Text>
                  <Text style={styles.infoValue}>{viewingCat?.intakeType || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>{viewingCat?.status || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Assigned Room</Text>
                  <Text style={styles.infoValue}>
                    {normalizeRoomLabel(viewingCat?.assignedRoom ?? viewingCat?.room) || 'Not set'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Intake Date</Text>
                  <Text style={styles.infoValue}>{viewingCat?.intakeDate || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{viewingCat?.name || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Sex</Text>
                  <Text style={styles.infoValue}>{viewingCat?.sex || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{viewingCat?.age || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Breed</Text>
                  <Text style={styles.infoValue}>{viewingCat?.breed || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Health Status</Text>
                  <Text style={styles.infoValue}>{viewingCat?.healthStatus || 'Not set'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Kapon</Text>
                  <Text style={styles.infoValue}>{viewingCat?.isKapon ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Temperament</Text>
                  <Text style={styles.infoValue}>
                    {viewingCat?.temperament?.length ? viewingCat.temperament.join(', ') : 'Not set'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Notes</Text>
                  <Text style={styles.infoValue}>{viewingCat?.notes?.trim() ? viewingCat.notes : 'No notes'}</Text>
                </View>
              </ScrollView>
              <Pressable style={styles.modalCloseButton} onPress={() => setViewingCat(null)}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(editingCat)} transparent animationType="fade" onRequestClose={() => setEditingCat(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardLarge}>
              <Text style={styles.modalTitle}>Edit Cat</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalFieldLabel}>Intake ID</Text>
                <TextInput
                  value={editForm?.intakeId ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, intakeId: value } : current))}
                  placeholder="CAT 001"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Intake Type</Text>
                <View style={styles.optionRow}>
                  {INTAKE_TYPES.map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.optionChip,
                        editForm?.intakeType === option && styles.optionChipActive,
                      ]}
                      onPress={() => setEditForm((current) => (current ? { ...current, intakeType: option } : current))}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          editForm?.intakeType === option && styles.optionChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalFieldLabel}>Status</Text>
                <TextInput
                  value={editForm?.status ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, status: value } : current))}
                  placeholder="New Intake"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Intake Date</Text>
                <TextInput
                  value={editForm?.intakeDate ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, intakeDate: value } : current))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Name</Text>
                <TextInput
                  value={editForm?.name ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, name: value } : current))}
                  placeholder="Cat name"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Sex</Text>
                <View style={styles.optionRow}>
                  {SEX_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.optionChip, editForm?.sex === option && styles.optionChipActive]}
                      onPress={() => setEditForm((current) => (current ? { ...current, sex: option } : current))}
                    >
                      <Text style={[styles.optionChipText, editForm?.sex === option && styles.optionChipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalFieldLabel}>Age</Text>
                <TextInput
                  value={editForm?.age ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, age: value } : current))}
                  placeholder="2 years"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Breed</Text>
                <TextInput
                  value={editForm?.breed ?? ''}
                  onChangeText={(value) => setEditForm((current) => (current ? { ...current, breed: value } : current))}
                  placeholder="Puspin"
                  placeholderTextColor="#AF7B88"
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Health Status</Text>
                <View style={styles.optionRow}>
                  {HEALTH_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.optionChip, editForm?.healthStatus === option && styles.optionChipActive]}
                      onPress={() =>
                        setEditForm((current) => (current ? { ...current, healthStatus: option } : current))
                      }
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          editForm?.healthStatus === option && styles.optionChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalFieldLabel}>Kapon</Text>
                <View style={styles.optionRow}>
                  <Pressable
                    style={[styles.optionChip, editForm?.isKapon && styles.optionChipActive]}
                    onPress={() => setEditForm((current) => (current ? { ...current, isKapon: !current.isKapon } : current))}
                  >
                    <Text style={[styles.optionChipText, editForm?.isKapon && styles.optionChipTextActive]}>
                      {editForm?.isKapon ? 'Yes' : 'No'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.modalFieldLabel}>Temperament</Text>
                <View style={styles.optionRow}>
                  {TEMPERAMENT_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.optionChip,
                        editForm?.temperament.includes(option) && styles.optionChipActive,
                      ]}
                      onPress={() => toggleEditTemperament(option)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          editForm?.temperament.includes(option) && styles.optionChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

              </ScrollView>

              <View style={styles.modalActionRow}>
                <Pressable
                  style={[styles.modalSecondaryButton]}
                  onPress={() => {
                    setEditingCat(null);
                    setEditForm(null);
                  }}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalPrimaryButton} onPress={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <ActivityIndicator color="#FFF7F2" /> : <Text style={styles.modalPrimaryButtonText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(assigningCat)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!savingAssignment) {
              setAssigningCat(null);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Assign to Room</Text>
              <Text style={styles.assignModalSubtitle}>
                Choose a room for {assigningCat?.name ?? 'this cat'}.
              </Text>

              <View style={styles.assignRoomOptions}>
                {SHELTER_ROOM_OPTIONS.map((roomOption) => (
                  <Pressable
                    key={roomOption}
                    style={styles.assignRoomOption}
                    onPress={() => handleAssignToShelter(roomOption)}
                    disabled={savingAssignment}
                  >
                    <Text style={styles.assignRoomOptionText}>{roomOption}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={styles.assignCancelButton}
                onPress={() => setAssigningCat(null)}
                disabled={savingAssignment}
              >
                <Text style={styles.assignCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(confirmDialog)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!confirmBusy) {
              setConfirmDialog(null);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{confirmDialog?.title}</Text>
              <Text style={styles.assignModalSubtitle}>{confirmDialog?.message}</Text>

              <View style={styles.modalActionRow}>
                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={() => setConfirmDialog(null)}
                  disabled={confirmBusy}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={confirmDialog?.isDestructive ? styles.modalDangerButton : styles.modalPrimaryButton}
                  onPress={handleConfirmDialog}
                  disabled={confirmBusy}
                >
                  {confirmBusy ? (
                    <ActivityIndicator color={confirmDialog?.isDestructive ? '#8F3C4F' : '#FFF7F2'} />
                  ) : (
                    <Text
                      style={
                        confirmDialog?.isDestructive
                          ? styles.modalDangerButtonText
                          : styles.modalPrimaryButtonText
                      }
                    >
                      {confirmDialog?.confirmLabel ?? 'Confirm'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(notice)}
          transparent
          animationType="fade"
          onRequestClose={() => setNotice(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{notice?.title}</Text>
              <Text style={styles.assignModalSubtitle}>{notice?.message}</Text>

              <Pressable style={[styles.modalPrimaryButton, styles.singleActionButton]} onPress={() => setNotice(null)}>
                <Text style={styles.modalPrimaryButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(noteCat)} transparent animationType="fade" onRequestClose={() => setNoteCat(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardLarge}>
              <Text style={styles.modalTitle}>Edit Note</Text>
              <Text style={styles.modalFieldLabel}>{noteCat?.name ?? 'Cat'}</Text>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add note"
                placeholderTextColor="#AF7B88"
                style={[styles.modalInput, styles.modalNotesInput]}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.modalActionRow}>
                <Pressable style={styles.modalDangerButton} onPress={handleClearNote} disabled={savingNote}>
                  <Text style={styles.modalDangerButtonText}>Clear Note</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={() => {
                    setNoteCat(null);
                    setNoteText('');
                  }}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalPrimaryButton} onPress={handleSaveNote} disabled={savingNote}>
                  {savingNote ? (
                    <ActivityIndicator color="#FFF7F2" />
                  ) : (
                    <Text style={styles.modalPrimaryButtonText}>Save Note</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  titleWrap: {
    marginTop: 26,
    marginBottom: 18,
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
  loadingWrap: {
    marginTop: 34,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8A4353',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 30,
    gap: 12,
  },
  searchWrap: {
    marginBottom: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    borderRadius: 14,
    backgroundColor: '#FFF9F5',
    color: '#6F2F41',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.24)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: '#730622',
    borderColor: '#730622',
  },
  filterChipText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFF7F2',
  },
  emptyCard: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  emptyTitle: {
    color: '#730622',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    color: '#8A4353',
    fontSize: 14,
    lineHeight: 20,
  },
  catCard: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#FEEBE2',
  },
  catPhotoFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#FFF2EC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  catPhotoFallbackText: {
    color: '#9B4D5F',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  catMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    color: '#730622',
    fontSize: 16,
    fontWeight: '800',
  },
  roomBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(42, 139, 82, 0.35)',
    backgroundColor: '#E9F8EF',
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  roomBadgeText: {
    color: '#1E7A47',
    fontSize: 11,
    fontWeight: '800',
  },
  actionGrid: {
    width: 134,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 'auto',
  },
  actionButton: {
    width: '47.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: '#FFF2EC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '800',
  },
  actionDangerButton: {
    borderColor: 'rgba(143, 60, 79, 0.38)',
    backgroundColor: '#FFF1EC',
  },
  actionDangerButtonText: {
    color: '#8F3C4F',
  },
  pinActionButtonActive: {
    backgroundColor: '#730622',
    borderColor: '#730622',
  },
  pinActionButtonTextActive: {
    color: '#FFF7F2',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(56, 26, 34, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  modalCardLarge: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
    maxHeight: '86%',
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalTitle: {
    color: '#730622',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalPhoto: {
    width: 120,
    height: 120,
    borderRadius: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#FEEBE2',
  },
  modalPhotoFallback: {
    width: 120,
    height: 120,
    borderRadius: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#FFF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalName: {
    marginTop: 12,
    color: '#730622',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalNotes: {
    marginTop: 8,
    color: '#8A4353',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  infoBlock: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.14)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  infoLabel: {
    color: '#9B4D5F',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  infoValue: {
    marginTop: 3,
    color: '#6F2F41',
    fontSize: 13,
    lineHeight: 18,
  },
  modalCloseButton: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: '#730622',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  modalCloseButtonText: {
    color: '#FFF7F2',
    fontSize: 14,
    fontWeight: '800',
  },
  modalFieldLabel: {
    marginTop: 8,
    marginBottom: 6,
    color: '#730622',
    fontSize: 13,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    borderRadius: 12,
    backgroundColor: '#FFF9F5',
    color: '#6F2F41',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  modalNotesInput: {
    minHeight: 86,
  },
  assignModalSubtitle: {
    marginBottom: 10,
    color: '#8A4353',
    fontSize: 13,
    lineHeight: 18,
  },
  assignRoomOptions: {
    gap: 8,
  },
  assignRoomOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  assignRoomOptionText: {
    color: '#6F2F41',
    fontSize: 14,
    fontWeight: '700',
  },
  assignCancelButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#FFF2EC',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  assignCancelButtonText: {
    color: '#8A4353',
    fontSize: 14,
    fontWeight: '800',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  optionChipActive: {
    backgroundColor: '#730622',
    borderColor: '#730622',
  },
  optionChipText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: '#FFF7F2',
  },
  modalActionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#730622',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  modalPrimaryButtonText: {
    color: '#FFF7F2',
    fontSize: 14,
    fontWeight: '800',
  },
  singleActionButton: {
    flex: 0,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#FFF2EC',
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  modalSecondaryButtonText: {
    color: '#8A4353',
    fontSize: 14,
    fontWeight: '800',
  },
  modalDangerButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: 'rgba(143, 60, 79, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  modalDangerButtonText: {
    color: '#8F3C4F',
    fontSize: 14,
    fontWeight: '800',
  },
});
