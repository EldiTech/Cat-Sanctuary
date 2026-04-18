import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

type ShelterRoomsScreenProps = {
  onBack: () => void;
  onOpenRoom: (roomId: ShelterRoomId) => void;
};

export type ShelterRoomId = 'puspin-rooms' | 'interaction-room' | 'recovery-room';

type ShelterRoom = {
  id: ShelterRoomId;
  name: string;
  note: string;
  capacity: number;
};

const SHELTER_ROOMS: ShelterRoom[] = [
  {
    id: 'puspin-rooms',
    name: 'Puspin Rooms',
    note: 'Main residential rooms dedicated to Puspin cats for daily care and rest.',
    capacity: 18,
  },
  {
    id: 'interaction-room',
    name: 'Interaction Room',
    note: 'Safe socialization space for bonding, enrichment, and supervised play.',
    capacity: 10,
  },
  {
    id: 'recovery-room',
    name: 'Recovery Room',
    note: 'Cats receiving treatment and recovery care stay in this room.',
    capacity: 8,
  },
];

type CatRoomRecord = {
  room?: string;
  assignedRoom?: string;
};

function normalizeRoomId(value: string): ShelterRoomId | null {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes('interaction')) {
    return 'interaction-room';
  }

  if (normalized.includes('recovery')) {
    return 'recovery-room';
  }

  if (normalized.includes('puspin')) {
    return 'puspin-rooms';
  }

  return null;
}

export default function ShelterRoomsScreen({ onBack, onOpenRoom }: ShelterRoomsScreenProps) {
  const [roomCounts, setRoomCounts] = useState<Record<ShelterRoomId, number>>({
    'puspin-rooms': 0,
    'interaction-room': 0,
    'recovery-room': 0,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cats'), (snapshot) => {
      const nextCounts: Record<ShelterRoomId, number> = {
        'puspin-rooms': 0,
        'interaction-room': 0,
        'recovery-room': 0,
      };

      snapshot.docs.forEach((catDoc) => {
        const cat = catDoc.data() as CatRoomRecord;
        const mappedRoom = normalizeRoomId(String(cat.assignedRoom ?? cat.room ?? ''));

        if (mappedRoom) {
          nextCounts[mappedRoom] += 1;
          return;
        }

        nextCounts['puspin-rooms'] += 1;
      });

      setRoomCounts(nextCounts);
    });

    return unsubscribe;
  }, []);

  const roomCards = useMemo(
    () =>
      SHELTER_ROOMS.map((room) => {
        const occupied = roomCounts[room.id];
        const remaining = Math.max(room.capacity - occupied, 0);
        const status = remaining === 0 ? 'Full' : 'Open';

        return {
          ...room,
          occupancyLabel: `${occupied} cat${occupied === 1 ? '' : 's'}`,
          status,
        };
      }),
    [roomCounts]
  );

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
          <Text style={styles.title}>Shelter Rooms</Text>
          <Text style={styles.caption}>View Puspin Rooms, Interaction Room, and Recovery Room.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {roomCards.map((room) => (
            <Pressable key={room.id} style={styles.roomCard} onPress={() => onOpenRoom(room.id)}>
              <View style={styles.roomTitleRow}>
                <Text style={styles.roomTitle}>{room.name}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{room.status}</Text>
                </View>
              </View>
              <Text style={styles.roomMeta}>{room.occupancyLabel}</Text>
              <Text style={styles.roomNote}>{room.note}</Text>
            </Pressable>
          ))}
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
  list: {
    paddingBottom: 30,
    gap: 12,
  },
  roomCard: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roomTitle: {
    color: '#730622',
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1,
  },
  roomMeta: {
    marginTop: 8,
    color: '#9B4D5F',
    fontSize: 14,
    fontWeight: '700',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(42, 139, 82, 0.35)',
    backgroundColor: '#E9F8EF',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusPillText: {
    color: '#1E7A47',
    fontSize: 12,
    fontWeight: '700',
  },
  roomNote: {
    marginTop: 10,
    color: '#8A4353',
    fontSize: 13,
    lineHeight: 18,
  },
});
