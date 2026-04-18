import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

type PuspinRoomsScreenProps = {
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
};

function isPuspinRoom(cat: CatRecord) {
  const roomValue = String(cat.assignedRoom ?? cat.room ?? '').toLowerCase();
  if (!roomValue.trim()) {
    return true;
  }

  return roomValue.includes('puspin');
}

export default function PuspinRoomsScreen({ onBack }: PuspinRoomsScreenProps) {
  const [residentCats, setResidentCats] = useState<CatRecord[]>([]);
  const [viewingCat, setViewingCat] = useState<CatRecord | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cats'), (snapshot) => {
      const cats = snapshot.docs
        .map((catDoc) => {
          const data = catDoc.data() as Omit<CatRecord, 'id'>;
          return {
            id: catDoc.id,
            intakeId: data.intakeId ?? 'CAT 001',
            intakeType: data.intakeType ?? 'Stray',
            status: data.status ?? 'New Intake',
            intakeDate: data.intakeDate ?? '',
            name: data.name?.trim() || 'Unnamed cat',
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
          };
        })
        .filter(isPuspinRoom);

      setResidentCats(cats);
    });

    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    const total = residentCats.length;
    return `${total} cat${total === 1 ? '' : 's'} in this room`;
  }, [residentCats]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF7F2', '#FFE6DB', '#FDEDD8', '#FFF8EF']}
        style={styles.gradient}
        start={{ x: 0, y: 0.05 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Puspin Rooms</Text>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
        </View>

        <Text style={styles.summary}>{summary}</Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {residentCats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No cats assigned yet.</Text>
              <Text style={styles.emptySubtitle}>Cats without a room are shown in this space by default.</Text>
            </View>
          ) : (
            residentCats.map((cat) => (
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

                <View style={styles.catInfo}>
                  <Text style={styles.catName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={styles.catMeta} numberOfLines={1}>
                    {cat.intakeId} - {cat.status}
                  </Text>
                </View>

                <Pressable style={styles.viewButton} onPress={() => setViewingCat(cat)}>
                  <Text style={styles.viewButtonText}>View Profile</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>

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
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#730622',
    fontSize: 28,
    fontWeight: '800',
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
  summary: {
    marginTop: 16,
    color: '#8A4353',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    marginTop: 14,
    paddingBottom: 24,
    gap: 10,
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
  catInfo: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    color: '#730622',
    fontSize: 16,
    fontWeight: '800',
  },
  catMeta: {
    marginTop: 3,
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '700',
  },
  viewButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: '#FFF2EC',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  emptyTitle: {
    color: '#730622',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#8A4353',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(56, 26, 34, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 18,
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
});
