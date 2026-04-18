import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

type InteractionRoomScreenProps = {
  onBack: () => void;
};

type CatRecord = {
  name?: string;
  room?: string;
  assignedRoom?: string;
};

function isInteractionRoom(cat: CatRecord) {
  const roomValue = String(cat.assignedRoom ?? cat.room ?? '').toLowerCase();
  return roomValue.includes('interaction');
}

export default function InteractionRoomScreen({ onBack }: InteractionRoomScreenProps) {
  const [residentNames, setResidentNames] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cats'), (snapshot) => {
      const names = snapshot.docs
        .map((catDoc) => catDoc.data() as CatRecord)
        .filter(isInteractionRoom)
        .map((cat) => cat.name?.trim() || 'Unnamed cat');

      setResidentNames(names);
    });

    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    const total = residentNames.length;
    return `${total} cat${total === 1 ? '' : 's'} in this room`;
  }, [residentNames]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF7F2', '#FFE6DB', '#FDEDD8', '#FFF8EF']}
        style={styles.gradient}
        start={{ x: 0, y: 0.05 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Interaction Room</Text>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
        </View>

        <Text style={styles.summary}>{summary}</Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {residentNames.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No cats assigned yet.</Text>
              <Text style={styles.emptySubtitle}>Assign cats with a room value containing Interaction.</Text>
            </View>
          ) : (
            residentNames.map((name, index) => (
              <View key={`${name}-${index}`} style={styles.catCard}>
                <Text style={styles.catName}>{name}</Text>
              </View>
            ))
          )}
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  catName: {
    color: '#730622',
    fontSize: 16,
    fontWeight: '700',
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
});
