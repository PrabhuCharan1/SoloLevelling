import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppRoute } from './types.ts';
import { AuthProvider } from './context/AuthContext.tsx';
import { QuestProvider } from './context/QuestContext.tsx';
import { WorkoutProvider } from './context/WorkoutContext.tsx';
import { WaterProvider } from './context/WaterContext.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
import { SplashScreen } from './screens/SplashScreen.tsx';
import { OnboardingScreen } from './screens/OnboardingScreen.tsx';
import { SignupScreen } from './screens/SignupScreen.tsx';
import { LoginScreen } from './screens/LoginScreen.tsx';
import { RoutineSetupScreen } from './screens/RoutineSetupScreen.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { QuestsScreen } from './screens/QuestsScreen.tsx';
import { WorkoutScreen } from './screens/WorkoutScreen.tsx';
import { ExerciseScreen } from './screens/ExerciseScreen.tsx';
import { WaterScreen } from './screens/WaterScreen.tsx';
import { StatsScreen } from './screens/StatsScreen.tsx';
import { CalendarHistoryScreen } from './screens/CalendarHistoryScreen.tsx';
import { RewardScreen } from './screens/RewardScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { RoutineEditorScreen } from './screens/RoutineEditorScreen.tsx';
import { AiSystemScreen } from './screens/AiSystemScreen.tsx';
import { BottomNavigation } from './components/BottomNavigation.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { InstallAppPrompt } from './components/InstallAppPrompt.tsx';
import { PwaUpdateToast } from './components/PwaUpdateToast.tsx';
import { LocalMigrationModal } from './components/LocalMigrationModal.tsx';
import { usePWA } from './hooks/usePWA.ts';
import { useReminderScheduler } from './hooks/useReminderScheduler.ts';
import { useCloudSync } from './services/useCloudSync.ts';

const validRoutes: AppRoute[] = [
  '/splash',
  '/onboarding',
  '/signup',
  '/login',
  '/setup',
  '/home',
  '/quests',
  '/workout',
  '/workout/chest',
  '/workout/triceps',
  '/workout/back',
  '/workout/biceps',
  '/workout/shoulders',
  '/workout/legs',
  '/workout/core',
  '/workout/fullbody',
  '/workout/body-scan',
  '/water',
  '/stats',
  '/history',
  '/rewards',
  '/settings',
  '/settings/routine',
  '/ai',
];

function AppContent() {
  // PWA hooks and background reminder scheduler
  const {
    isOnline,
    onlineStatusChanged,
    isInstalled,
    isInstallable,
    isIOS,
    isInstallDismissed,
    installApp,
    dismissInstallPrompt,
    needRefresh,
    updateApp,
  } = usePWA();

  useReminderScheduler();
  useCloudSync();

  // Initialize route from current window path or default to splash
  const getInitialRoute = (): AppRoute => {
    const path = window.location.pathname as AppRoute;
    if (validRoutes.includes(path) || path.startsWith('/workout')) {
      return path;
    }
    return '/splash';
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [historyStack, setHistoryStack] = useState<AppRoute[]>([getInitialRoute()]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      if (validRoutes.includes(path) || path.startsWith('/workout')) {
        setCurrentRoute(path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update browser URL on route change
  const navigate = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
    setHistoryStack((prev) => [...prev, route]);
    if (window.location.pathname !== route) {
      window.history.pushState(null, '', route);
    }
  }, []);

  // Handle back button action
  const handleBack = useCallback(() => {
    if (currentRoute === '/settings/routine') {
      navigate('/settings');
      return;
    }

    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop();
      const prevRoute = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      setCurrentRoute(prevRoute);
      window.history.pushState(null, '', prevRoute);
      return;
    }

    if (currentRoute === '/history') {
      navigate('/stats');
      return;
    }

    if (
      currentRoute === '/water' ||
      currentRoute.startsWith('/workout/') ||
      currentRoute === '/settings' ||
      currentRoute === '/rewards' ||
      currentRoute === '/ai'
    ) {
      navigate('/home');
      return;
    }

    window.history.back();
  }, [currentRoute, historyStack, navigate]);

  // Determine whether to show bottom navigation
  const showBottomNav =
    currentRoute === '/home' ||
    currentRoute === '/quests' ||
    currentRoute.startsWith('/workout') ||
    currentRoute === '/water' ||
    currentRoute === '/stats' ||
    currentRoute === '/history' ||
    currentRoute === '/rewards';

  const isExerciseRoute =
    currentRoute === '/workout/exercise' ||
    currentRoute === '/workout/chest' ||
    currentRoute === '/workout/triceps' ||
    currentRoute === '/workout/back' ||
    currentRoute === '/workout/biceps' ||
    currentRoute === '/workout/shoulders' ||
    currentRoute === '/workout/legs' ||
    currentRoute === '/workout/core' ||
    currentRoute === '/workout/fullbody';

  const showInstallBannerOnRoute =
    currentRoute === '/home' && !isInstalled && !isInstallDismissed && (isInstallable || isIOS);

  return (
    <div className="min-h-screen bg-[#04060d] flex justify-center text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting on wide screens */}
      <div className="fixed inset-0 pointer-events-none bg-grid-system opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-cyan-950/20 via-purple-950/15 to-transparent blur-3xl pointer-events-none" />

      {/* Global PWA Connectivity Indicator */}
      <OfflineIndicator isOnline={isOnline} onlineStatusChanged={onlineStatusChanged} />

      {/* PWA Service Worker Update Prompt */}
      <PwaUpdateToast needRefresh={needRefresh} onUpdate={updateApp} />

      {/* Mobile-first viewport container (around 390px - 430px, responsive on tablet/desktop) */}
      <div className="relative w-full max-w-[430px] min-h-screen bg-[#05070e] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] border-x border-cyan-950/30 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.main
            key={currentRoute}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex-1 flex flex-col w-full"
          >
            {currentRoute === '/splash' && <SplashScreen onNavigate={navigate} />}
            {currentRoute === '/onboarding' && <OnboardingScreen onNavigate={navigate} />}
            {currentRoute === '/signup' && <SignupScreen onNavigate={navigate} />}
            {currentRoute === '/login' && <LoginScreen onNavigate={navigate} />}
            {currentRoute === '/setup' && <RoutineSetupScreen onNavigate={navigate} />}
            {currentRoute === '/home' && <HomeScreen onNavigate={navigate} />}
            {currentRoute === '/quests' && <QuestsScreen onNavigate={navigate} />}
            {currentRoute === '/workout' && <WorkoutScreen onNavigate={navigate} />}
            {currentRoute === '/workout/body-scan' && (
              <WorkoutScreen onNavigate={navigate} initialTab="body-scan" />
            )}
            {isExerciseRoute && <ExerciseScreen onNavigate={navigate} />}
            {currentRoute === '/water' && <WaterScreen onNavigate={navigate} />}
            {currentRoute === '/stats' && <StatsScreen onNavigate={navigate} />}
            {currentRoute === '/history' && (
              <CalendarHistoryScreen onNavigate={navigate} onBack={handleBack} />
            )}
            {currentRoute === '/rewards' && (
              <RewardScreen onNavigate={navigate} onBack={handleBack} />
            )}
            {currentRoute === '/settings' && (
              <SettingsScreen onNavigate={navigate} onBack={handleBack} />
            )}
            {currentRoute === '/settings/routine' && (
              <RoutineEditorScreen onNavigate={navigate} onBack={() => navigate('/settings')} />
            )}
            {currentRoute === '/ai' && (
              <AiSystemScreen onNavigate={navigate} onBack={handleBack} />
            )}
          </motion.main>
        </AnimatePresence>

        {/* Local Data Migration Modal (triggered when existing local data found on new account) */}
        <LocalMigrationModal />

        {/* In-App Install App Prompt (on Home screen when eligible) */}
        {showInstallBannerOnRoute && (
          <div className="w-full pb-20">
            <InstallAppPrompt
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              isIOS={isIOS}
              isDismissed={isInstallDismissed}
              onInstall={installApp}
              onDismiss={dismissInstallPrompt}
            />
          </div>
        )}

        {/* Fixed Bottom Navigation */}
        {showBottomNav && (
          <BottomNavigation currentRoute={currentRoute} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <QuestProvider>
          <WorkoutProvider>
            <WaterProvider>
              <AppContent />
            </WaterProvider>
          </WorkoutProvider>
        </QuestProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
