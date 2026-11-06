import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { useStore } from '@/store';

export default function TabsLayout() {
  const { signedIn, role } = useStore();
  if (!signedIn || !role) return <Redirect href="/" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="followup" />
      <Tabs.Screen name="patients" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="trends" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
