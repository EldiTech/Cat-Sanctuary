import { LinearGradient } from 'expo-linear-gradient';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ShelterDashboardProps = {
  onBack: () => void;
  onOpenManageCats: () => void;
  onOpenAddCat: () => void;
  onOpenShelterRooms: () => void;
  onClearAlerts?: () => Promise<void> | void;
  catCount: number;
  notifications: DashboardNotification[];
};

type DashboardNotification = {
  id: string;
  message: string;
  catName: string;
  createdAt?: Timestamp;
};

type DashboardCard = {
  key: 'manage' | 'add' | 'shelter' | 'adoption' | 'funds';
  title: string;
  subtitle: string;
  value: string;
};

type DashboardCardVariant = 'hero' | 'tall' | 'compact';

const STATIC_CARDS: Omit<DashboardCard, 'value'>[] = [
  {
    key: 'manage',
    title: 'Manage Cats',
    subtitle: 'View and update your resident cat profiles.',
  },
  {
    key: 'add',
    title: 'New Cat',
    subtitle: 'Create a new intake profile in the sanctuary.',
  },
  {
    key: 'shelter',
    title: 'Shelter',
    subtitle: 'View specific rooms in your shelter.',
  },
  {
    key: 'adoption',
    title: 'Adoption',
    subtitle: 'Manage future adoption requests, matches, and releases.',
  },
  {
    key: 'funds',
    title: 'Funds',
    subtitle: 'Track donations and current monthly budget.',
  },
];

export default function ShelterDashboard({
  onBack,
  onOpenManageCats,
  onOpenAddCat,
  onOpenShelterRooms,
  onClearAlerts = async () => {},
  catCount,
  notifications,
}: ShelterDashboardProps) {
  const { height } = useWindowDimensions();
  const isCompact = height < 820;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [clearingAlerts, setClearingAlerts] = useState(false);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    if (notifications.length > 0) {
      pulse.start();
    }

    return () => {
      pulse.stop();
      badgeScale.setValue(1);
    };
  }, [badgeScale, notifications.length]);

  const dashboardCards: DashboardCard[] = [
    { ...STATIC_CARDS[0], value: `${catCount} cat${catCount === 1 ? '' : 's'}` },
    { ...STATIC_CARDS[1], value: 'Start intake' },
    { ...STATIC_CARDS[2], value: 'View rooms' },
    { ...STATIC_CARDS[3], value: 'Coming Soon' },
    { ...STATIC_CARDS[4], value: 'Coming Soon' },
  ];

  const latestNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);
  const cardByKey = useMemo(
    () => Object.fromEntries(dashboardCards.map((card) => [card.key, card])) as Record<DashboardCard['key'], DashboardCard>,
    [dashboardCards]
  );

  const handleCardPress = (key: DashboardCard['key']) => {
    if (key === 'manage') {
      onOpenManageCats();
      return;
    }

    if (key === 'add') {
      onOpenAddCat();
      return;
    }

    if (key === 'shelter') {
      onOpenShelterRooms();
    }
  };

  const handleClearAlerts = async () => {
    if (clearingAlerts || notifications.length === 0) {
      return;
    }

    setClearingAlerts(true);
    try {
      await onClearAlerts();
    } catch (error) {
      console.error('Failed to clear alerts', error);
    } finally {
      setClearingAlerts(false);
    }
  };

  const renderDashboardCard = (card: DashboardCard, variant: DashboardCardVariant) => {
    const isComingSoon = card.key === 'funds' || card.key === 'adoption';

    const variantStyle =
      variant === 'hero'
        ? styles.cardHero
        : variant === 'tall'
        ? styles.cardTall
        : styles.cardCompact;

    const variantCompactStyle =
      variant === 'hero'
        ? styles.cardHeroCompact
        : variant === 'tall'
        ? styles.cardTallCompact
        : styles.cardCompactCompact;

    return (
      <Pressable
        key={card.key}
        style={[
          styles.card,
          variantStyle,
          isCompact && styles.cardCompactMode,
          isCompact && variantCompactStyle,
          isComingSoon && styles.cardDisabled,
        ]}
        onPress={() => handleCardPress(card.key)}
        disabled={isComingSoon}
      >
        {isComingSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
          </View>
        ) : null}
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardValue}>{card.value}</Text>
        <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
      </Pressable>
    );
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
          <View style={styles.headerActions}>
            <Pressable style={styles.notificationBadgeWrap} onPress={() => setShowAlertsModal(true)}>
              <Text style={styles.notificationBellText}>Alerts</Text>
              <Animated.View
                style={[
                  styles.notificationCountBadge,
                  notifications.length > 0 && styles.notificationCountBadgeActive,
                  { transform: [{ scale: badgeScale }] },
                ]}
              >
                <Text style={styles.notificationCountText}>{notifications.length}</Text>
              </Animated.View>
            </Pressable>
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonLabel}>Back</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>CAT SANCTUARY</Text>
          <Text style={styles.title}>Shelter Dashboard</Text>
          <Text style={styles.caption}>Manage care operations, comfort, and support from one place.</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.grid, isCompact && styles.gridCompact]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.bentoWrap, isCompact && styles.bentoWrapCompact]}>
            {renderDashboardCard(cardByKey.manage, 'hero')}

            <View style={[styles.bentoRow, isCompact && styles.bentoRowCompact]}>
              <View style={[styles.bentoColumn, isCompact && styles.bentoColumnCompact]}>
                {renderDashboardCard(cardByKey.add, 'compact')}
                {renderDashboardCard(cardByKey.adoption, 'compact')}
              </View>

              <View style={[styles.bentoColumn, isCompact && styles.bentoColumnCompact]}>
                {renderDashboardCard(cardByKey.shelter, 'tall')}
                {renderDashboardCard(cardByKey.funds, 'compact')}
              </View>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={showAlertsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAlertsModal(false)}
        >
          <View style={styles.alertsModalBackdrop}>
            <View style={styles.alertsModalCard}>
              <View style={styles.alertsModalHeader}>
                <Text style={styles.alertsModalTitle}>Note Notifications</Text>
                <View style={styles.alertsHeaderActions}>
                  <Pressable
                    style={[
                      styles.alertsClearButton,
                      (notifications.length === 0 || clearingAlerts) && styles.alertsClearButtonDisabled,
                    ]}
                    onPress={handleClearAlerts}
                    disabled={notifications.length === 0 || clearingAlerts}
                  >
                    <Text style={styles.alertsClearButtonText}>{clearingAlerts ? 'Clearing...' : 'Clear Alerts'}</Text>
                  </Pressable>
                  <Pressable style={styles.alertsCloseButton} onPress={() => setShowAlertsModal(false)}>
                    <Text style={styles.alertsCloseButtonText}>Close</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.alertsModalSubtitle}>Newest updates are shown first.</Text>

              <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
                {latestNotifications.length > 0 ? (
                  latestNotifications.map((item, index) => (
                    <View key={item.id} style={[styles.notificationItem, index === 0 && styles.notificationItemPriority]}>
                      <View style={styles.notificationDot} />
                      <View style={styles.notificationBody}>
                        <Text style={styles.notificationMessage}>{item.message}</Text>
                        <Text style={styles.notificationMeta}>Cat: {item.catName}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.notificationEmpty}>
                    <Text style={styles.notificationEmptyText}>No note notifications yet.</Text>
                  </View>
                )}
              </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
  },
  notificationBellText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '800',
  },
  notificationCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8C7CF',
    paddingHorizontal: 6,
  },
  notificationCountBadgeActive: {
    backgroundColor: '#730622',
  },
  notificationCountText: {
    color: '#FFF7F2',
    fontSize: 11,
    fontWeight: '800',
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
  grid: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  gridCompact: {
    paddingBottom: 10,
  },
  bentoWrap: {
    flex: 1,
    gap: 12,
  },
  bentoWrapCompact: {
    gap: 10,
  },
  bentoRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  bentoRowCompact: {
    gap: 10,
  },
  bentoColumn: {
    flex: 1,
    gap: 12,
  },
  bentoColumnCompact: {
    gap: 10,
  },
  alertsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(56, 26, 34, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  alertsModalCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(115, 6, 34, 0.28)',
    shadowColor: '#730622',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
    maxHeight: '78%',
  },
  alertsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  alertsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertsModalTitle: {
    color: '#730622',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  alertsClearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(42, 139, 82, 0.35)',
    backgroundColor: '#E9F8EF',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  alertsClearButtonDisabled: {
    borderColor: 'rgba(155, 77, 95, 0.2)',
    backgroundColor: '#F5ECEF',
  },
  alertsClearButtonText: {
    color: '#1E7A47',
    fontSize: 12,
    fontWeight: '800',
  },
  alertsCloseButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.25)',
    backgroundColor: '#FFF2EC',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  alertsCloseButtonText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '800',
  },
  alertsModalSubtitle: {
    marginTop: 4,
    color: '#8A4353',
    fontSize: 12,
    lineHeight: 16,
  },
  alertsList: {
    marginTop: 8,
  },
  notificationItem: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.18)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notificationItemPriority: {
    borderColor: 'rgba(115, 6, 34, 0.38)',
    backgroundColor: '#FFF2EC',
  },
  notificationDot: {
    marginTop: 5,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#730622',
  },
  notificationBody: {
    flex: 1,
  },
  notificationMessage: {
    color: '#6F2F41',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  notificationMeta: {
    marginTop: 2,
    color: '#8A4353',
    fontSize: 12,
    lineHeight: 16,
  },
  notificationEmpty: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 77, 95, 0.16)',
    backgroundColor: '#FFF9F5',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  notificationEmptyText: {
    color: '#8A4353',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(231, 141, 118, 0.24)',
    shadowColor: '#A33B54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHero: {
    flex: 0,
    minHeight: 120,
    borderColor: 'rgba(115, 6, 34, 0.24)',
    backgroundColor: '#FFFDFC',
  },
  cardHeroCompact: {
    minHeight: 100,
  },
  cardTall: {
    flex: 1.5,
  },
  cardTallCompact: {
    flex: 1.5,
  },
  cardCompact: {
    flex: 1,
  },
  cardCompactCompact: {
    flex: 1,
  },
  cardCompactMode: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardDisabled: {
    opacity: 0.88,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(115, 6, 34, 0.24)',
    backgroundColor: '#FFF2EC',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  comingSoonBadgeText: {
    color: '#8F3C4F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardTitle: {
    color: '#730622',
    fontSize: 20,
    fontWeight: '800',
  },
  cardValue: {
    marginTop: 8,
    color: '#9B4D5F',
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    marginTop: 'auto',
    paddingTop: 8,
    color: '#8A4353',
    fontSize: 13,
    lineHeight: 18,
  },
});
