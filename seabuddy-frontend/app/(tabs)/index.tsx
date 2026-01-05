import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { initDatabase } from '@/lib/db';
import { format } from 'date-fns';
import type { MoodType } from '@/lib/types';

// Initialize database on app start
initDatabase();

const MOODS: { value: MoodType; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great', color: 'bg-green-500' },
  { value: 'good', emoji: '🙂', label: 'Good', color: 'bg-blue-500' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'bg-yellow-500' },
  { value: 'bad', emoji: '😟', label: 'Bad', color: 'bg-orange-500' },
  { value: 'terrible', emoji: '😢', label: 'Terrible', color: 'bg-red-500' },
];

export default function HomeScreen() {
  const {
    initialize,
    moodLogs,
    isOnline,
    isSyncing,
    syncStatus,
    createMoodLog,
    loadMoodLogs,
    performSync,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    createMoodLog(mood);

    // Reset after animation
    setTimeout(() => setSelectedMood(null), 300);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    loadMoodLogs();
    setRefreshing(false);
  };

  const pendingCount = syncStatus.reduce((sum, s) => sum + s.pendingCount, 0);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <View className="px-6 pt-16 pb-8">
        <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">SeaBuddy</Text>
        <Text className="text-gray-600 dark:text-gray-400 text-base">How are you feeling today?</Text>

        {/* Sync Status */}
        <View className="mt-4 flex-row items-center gap-2">
          <View className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {isOnline ? 'Online' : 'Offline'}
            {isSyncing && ' • Syncing...'}
            {pendingCount > 0 && ` • ${pendingCount} pending`}
          </Text>
        </View>
      </View>

      {/* Mood Selection */}
      <View className="px-6 mb-8">
        <View className="flex-row justify-between">
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.value}
              onPress={() => handleMoodSelect(mood.value)}
              className={`items-center justify-center w-16 h-16 rounded-2xl ${
                selectedMood === mood.value ? mood.color : 'bg-gray-100 dark:bg-gray-800'
              }`}
              activeOpacity={0.7}>
              <Text className="text-3xl">{mood.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row justify-between mt-2">
          {MOODS.map((mood) => (
            <Text key={mood.value} className="text-xs text-gray-500 dark:text-gray-400 w-16 text-center">
              {mood.label}
            </Text>
          ))}
        </View>
      </View>

      {/* Recent Mood Logs */}
      <View className="px-6 pb-8">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Logs</Text>

        {moodLogs.length === 0 ? (
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 items-center">
            <Text className="text-gray-500 dark:text-gray-400 text-center">
              No mood logs yet. Tap an emoji above to start tracking!
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {moodLogs.slice(0, 10).map((log) => {
              const moodInfo = MOODS.find((m) => m.value === log.mood);
              return (
                <View
                  key={log.localId}
                  className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-3xl">{moodInfo?.emoji}</Text>
                    <View>
                      <Text className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                        {log.mood}
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </Text>
                      {log.notes && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.notes}</Text>
                      )}
                    </View>
                  </View>

                  {/* Sync indicator */}
                  {log.syncStatus === 'PENDING' && (
                    <View className="bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                      <Text className="text-xs text-yellow-700 dark:text-yellow-400">Pending</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
