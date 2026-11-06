import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { StoreProvider, useStore } from '@/store';
import { DeviceProvider } from '@/device/DeviceProvider';
import { Toast } from '@/components/ui';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { hydrated } = useStore();
  const ready = fontsReady && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  const app = (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.gradientTop } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
      <Toast />
    </>
  );
  // On a desktop browser, show the app in a phone-sized column.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E3B45', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden' }}>{app}</View>
      </View>
    );
  }
  return app;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    ...Feather.font,
  });
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <DeviceProvider>
          <Shell fontsReady={loaded || !!error} />
        </DeviceProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
