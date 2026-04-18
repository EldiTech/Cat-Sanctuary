import { LinearGradient } from 'expo-linear-gradient';
import { collection, deleteDoc, getDocs, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { db } from './firebaseConfig';
import AddNewCatScreen from './Shelter Management/Manage Cats/AddNewCatScreen';
import ManageCatsScreen from './Shelter Management/Manage Cats/ManageCatsScreen';
import ShelterDashboard from './Shelter Management/ShelterDashboard';
import { ShelterRoomId } from './Shelter Management/Shelter Rooms/ShelterRoomsScreen';
import ShelterRoomsScreen from './Shelter Management/Shelter Rooms/ShelterRoomsScreen';

const InteractionRoomScreen = require('./Shelter Management/Shelter Rooms/InteractionRoomScreen').default;
const PuspinRoomsScreen = require('./Shelter Management/Shelter Rooms/PuspinRoomsScreen').default;
const RecoveryRoomScreen = require('./Shelter Management/Shelter Rooms/RecoveryRoomScreen').default;

const HERO_IMAGE = require('./assets/CSC.png');

type CafeSplashScreenProps = {
  onFinish?: () => void;
  onManageShelter?: () => void;
};

type ShelterNotification = {
  id: string;
  message: string;
  catName: string;
  createdAt?: Timestamp;
};

function CafeSplashScreen({ onFinish, onManageShelter }: CafeSplashScreenProps) {
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardTranslateY = useRef(new Animated.Value(18)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.9)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleRise = useRef(new Animated.Value(10)).current;
  const shimmerTranslate = useRef(new Animated.Value(-280)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 280,
        duration: 1700,
        useNativeDriver: true,
      })
    );

    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.02,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 0.98,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerLoop.start();
    haloLoop.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 74,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 84,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleRise, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(950),
      ...(onFinish
        ? [
            Animated.timing(fadeOut, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]).start(() => {
      if (onFinish) {
        shimmerLoop.stop();
        haloLoop.stop();
        onFinish();
      }
    });

    return () => {
      shimmerLoop.stop();
      haloLoop.stop();
    };
  }, [
    cardOpacity,
    cardScale,
    cardTranslateY,
    fadeOut,
    haloOpacity,
    haloScale,
    logoRotate,
    logoScale,
    onFinish,
    shimmerTranslate,
    subtitleOpacity,
    subtitleRise,
  ]);

  const tilt = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  const handleManageShelter = () => {
    if (onManageShelter) {
      onManageShelter();
      return;
    }

    // Fallback for standalone preview when no handler is passed.
    console.log('Manage My Shelter pressed');
  };

  return (
    <Animated.View style={[styles.splashContainer, { opacity: fadeOut }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF6F3" />
      <LinearGradient
        colors={['#FFF7F2', '#FFE6DB', '#FDEDD8', '#FFF8EF']}
        style={styles.gradient}
        start={{ x: 0, y: 0.05 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.demoLogoBadge}>
          <Text style={styles.demoLogoText}>DEMO</Text>
        </View>

        <View style={styles.ambientOrbTop} />
        <View style={styles.ambientOrbBottom} />

        <Animated.View
          style={[
            styles.logoHalo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.contentStack,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoWrap,
              {
                transform: [{ scale: logoScale }, { rotate: tilt }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFF7F2', '#FFE6DB', '#FDEDD8', '#FFF8EF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoWrapGradient}
            />
            <Image source={HERO_IMAGE} style={styles.logo} resizeMode="contain" />
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }, { rotate: '18deg' }],
                },
              ]}
            />
          </Animated.View>

          <Animated.Text
            style={[
              styles.kicker,
              { opacity: subtitleOpacity, transform: [{ translateY: subtitleRise }] },
            ]}
          >
            CAT SANCTUARY
          </Animated.Text>
          <Animated.Text style={[styles.splashTitle, { opacity: subtitleOpacity }]}> 
            Cat Sanctuary Cafe
          </Animated.Text>
          <Animated.Text style={[styles.caption, { opacity: subtitleOpacity }]}>
            Cozy care, safe spaces, and happy paws.
          </Animated.Text>

          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Pressable style={styles.manageButton} onPress={handleManageShelter}>
              <Animated.Text style={styles.manageButtonLabel}>Manage My Shelter</Animated.Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<
    'splash' | 'dashboard' | 'manageCats' | 'addCat' | 'shelterRooms' | ShelterRoomId
  >('splash');
  const [catCount, setCatCount] = useState(0);
  const [notifications, setNotifications] = useState<ShelterNotification[]>([]);

  const handleOpenRoom = (roomId: ShelterRoomId) => {
    setScreen(roomId);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cats'), (snapshot) => {
      setCatCount(snapshot.size);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const nextNotifications = snapshot.docs.map((doc) => {
        const data = doc.data() as Omit<ShelterNotification, 'id'>;
        return {
          id: doc.id,
          message: data.message ?? 'A new shelter update is available.',
          catName: data.catName ?? 'Unknown cat',
          createdAt: data.createdAt,
        };
      });

      setNotifications(nextNotifications);
    });

    return unsubscribe;
  }, []);

  const handleClearAlerts = async () => {
    const snapshot = await getDocs(collection(db, 'notifications'));
    await Promise.all(snapshot.docs.map((notificationDoc) => deleteDoc(notificationDoc.ref)));
  };

  if (screen === 'dashboard') {
    return (
      <ShelterDashboard
        onBack={() => setScreen('splash')}
        onOpenManageCats={() => setScreen('manageCats')}
        onOpenAddCat={() => setScreen('addCat')}
        onOpenShelterRooms={() => setScreen('shelterRooms')}
        onClearAlerts={handleClearAlerts}
        catCount={catCount}
        notifications={notifications}
      />
    );
  }

  if (screen === 'manageCats') {
    return <ManageCatsScreen onBack={() => setScreen('dashboard')} />;
  }

  if (screen === 'addCat') {
    return <AddNewCatScreen onBack={() => setScreen('dashboard')} onCatAdded={() => setScreen('manageCats')} />;
  }

  if (screen === 'shelterRooms') {
    return <ShelterRoomsScreen onBack={() => setScreen('dashboard')} onOpenRoom={handleOpenRoom} />;
  }

  if (screen === 'puspin-rooms') {
    return <PuspinRoomsScreen onBack={() => setScreen('shelterRooms')} />;
  }

  if (screen === 'interaction-room') {
    return <InteractionRoomScreen onBack={() => setScreen('shelterRooms')} />;
  }

  if (screen === 'recovery-room') {
    return <RecoveryRoomScreen onBack={() => setScreen('shelterRooms')} />;
  }

  return <CafeSplashScreen onManageShelter={() => setScreen('dashboard')} />;
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  demoLogoBadge: {
    position: 'absolute',
    top: 56,
    left: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(115, 6, 34, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 247, 242, 0.7)',
    shadowColor: '#730622',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 4,
  },
  demoLogoText: {
    color: '#FFF7F2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
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
  logoHalo: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
  },
  contentStack: {
    width: '100%',
    maxWidth: 390,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  logoWrap: {
    width: 238,
    height: 238,
    borderRadius: 119,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 242, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(231, 141, 118, 0.28)',
    shadowColor: '#730622',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  logoWrapGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logo: {
    width: '118%',
    height: '118%',
  },
  shimmer: {
    position: 'absolute',
    top: -30,
    left: -120,
    width: 58,
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  kicker: {
    marginTop: 20,
    fontSize: 11,
    fontWeight: '700',
    color: '#9B4D5F',
    letterSpacing: 2,
  },
  splashTitle: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: '800',
    color: '#730622',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  caption: {
    marginTop: 10,
    fontSize: 15,
    color: '#8A4353',
    letterSpacing: 0.15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 22,
    maxWidth: 320,
  },
  manageButton: {
    marginTop: 26,
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#730622',
    shadowColor: '#730622',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
  manageButtonLabel: {
    color: '#FFF7F2',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
