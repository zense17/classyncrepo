// lib/scheduler.ts
import * as Notifications from 'expo-notifications';
import { Course, parseTimeString } from './database'; 


// 1. Config: Allow notifications to show even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAY_MAP: Record<string, number> = {
  Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7
};

export async function scheduleCourseNotifications(courses: Course[]) {
  // 1. Cancel all old notifications so we don't get duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("Old notifications cancelled. Scheduling new ones...");

  let count = 0;

  for (const course of courses) {
    // 2. Reuse your existing robust time parser
    const schedules = parseTimeString(course.time);

    for (const schedule of schedules) {
      // Parse "10:30 AM"
      const timeMatch = schedule.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) continue;

      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();

      // Convert to 24h format for the system
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

     // 3. Calculate 30 Minutes BEFORE class
      let notifyMinute = minute - 30; // Changed from 15 to 30
      let notifyHour = hour;

      // Handle time rollback (e.g. 10:15 AM - 30 mins = 09:45 AM)
      if (notifyMinute < 0) {
        notifyMinute += 60; // Adds 60 to the negative number (e.g. -15 + 60 = 45)
        notifyHour -= 1;
      }
      
      // Handle midnight rollback (e.g. 12:15 AM - 30 mins = 11:45 PM previous day)
      if (notifyHour < 0) {
        notifyHour += 24;
      }
      
      for (const dayStr of schedule.days) {
        // Map "Mon", "M", "Monday" to Expo's specific number (1=Sun, 2=Mon...)
        // We find the key in DAY_MAP that starts with your day string
        const dayKey = Object.keys(DAY_MAP).find(k => 
           dayStr.toUpperCase().startsWith(k.toUpperCase()) || 
           k.toUpperCase().startsWith(dayStr.toUpperCase())
        );
        
        const weekday = dayKey ? DAY_MAP[dayKey] : null;

      if (weekday) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Class Starting Soon: ${course.code}`,
              body: `${course.title} starts at ${schedule.startTime} in ${course.room}`,
              sound: true,
              data: { screen: '(tabs)/calendar' },
            },
            trigger: {
              // 👇 FIXED FOR ANDROID: Use "WEEKLY"
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY, 
              
              weekday: weekday, 
              hour: notifyHour,
              minute: notifyMinute,
              // repeats: true is implied by the 'WEEKLY' type on Android
            },
          });
          count++;
        }
      }
    }
  }
  
  console.log(`Scheduled ${count} class reminders successfully!`);
}