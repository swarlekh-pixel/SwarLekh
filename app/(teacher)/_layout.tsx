import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-exam" />
      <Stack.Screen name="exam/[id]" />
      <Stack.Screen name="exam/[id]/submissions" />
      <Stack.Screen name="exam/[id]/add-questions" />
    </Stack>
  );
}
