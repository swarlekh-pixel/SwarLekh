import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="teacher-auth" />
      <Stack.Screen name="student-auth" />
    </Stack>
  );
}
