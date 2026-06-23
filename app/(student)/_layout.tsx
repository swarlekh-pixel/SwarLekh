import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="exam/[id]" />
      <Stack.Screen name="submission/[id]" />
    </Stack>
  );
}
