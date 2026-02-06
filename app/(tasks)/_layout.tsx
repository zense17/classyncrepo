// app/(tasks)/_layout.tsx
// Stack navigation for tasks section

import { Stack } from 'expo-router';

export default function TasksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="addTask" 
        options={{ 
          title: 'Add Task',
          presentation: 'card',
        }} 
      />
    </Stack>
  );
}