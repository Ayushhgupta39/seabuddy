import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { format } from 'date-fns';

export default function ExploreScreen() {
  const { journalEntries, resources, createJournalEntry, deleteJournalEntry, loadResources } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [activeTab, setActiveTab] = useState<'journal' | 'resources'>('journal');

  const handleCreateEntry = () => {
    if (!newContent.trim()) return;

    createJournalEntry(newContent, newTitle || undefined);
    setNewTitle('');
    setNewContent('');
    setModalVisible(false);
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Explore</Text>
        <Text className="text-gray-600 dark:text-gray-400 text-base">Your journal and resources</Text>
      </View>

      {/* Tabs */}
      <View className="px-6 mb-4 flex-row gap-3">
        <TouchableOpacity
          onPress={() => setActiveTab('journal')}
          className={`flex-1 py-3 rounded-xl ${
            activeTab === 'journal' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
          <Text
            className={`text-center font-semibold ${
              activeTab === 'journal' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
            Journal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('resources');
            loadResources();
          }}
          className={`flex-1 py-3 rounded-xl ${
            activeTab === 'resources' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
          <Text
            className={`text-center font-semibold ${
              activeTab === 'resources' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
            Resources
          </Text>
        </TouchableOpacity>
      </View>

      {/* Journal Tab */}
      {activeTab === 'journal' && (
        <ScrollView className="flex-1">
          <View className="px-6 pb-8">
            {/* New Entry Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-blue-500 py-4 rounded-2xl mb-6 items-center"
              activeOpacity={0.8}>
              <Text className="text-white font-semibold text-base">+ New Journal Entry</Text>
            </TouchableOpacity>

            {/* Journal Entries */}
            {journalEntries.length === 0 ? (
              <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 items-center">
                <Text className="text-gray-500 dark:text-gray-400 text-center">
                  No journal entries yet. Start writing to track your thoughts!
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {journalEntries.map((entry) => (
                  <View key={entry.localId} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        {entry.title && (
                          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {entry.title}
                          </Text>
                        )}
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(entry.createdAt), 'MMM d, yyyy · h:mm a')}
                        </Text>
                      </View>

                      {/* Sync status */}
                      {entry.syncStatus === 'PENDING' && (
                        <View className="bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                          <Text className="text-xs text-yellow-700 dark:text-yellow-400">Pending</Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-gray-700 dark:text-gray-300 leading-6" numberOfLines={5}>
                      {entry.content}
                    </Text>

                    {entry.mood && (
                      <View className="mt-3 flex-row items-center">
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          Mood: <Text className="capitalize">{entry.mood}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <ScrollView className="flex-1">
          <View className="px-6 pb-8">
            {resources.length === 0 ? (
              <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 items-center">
                <Text className="text-gray-500 dark:text-gray-400 text-center">
                  No resources available. Check back when you're online!
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {resources.map((resource) => (
                  <TouchableOpacity
                    key={resource.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4"
                    activeOpacity={0.7}>
                    <View className="flex-row items-start gap-3">
                      {/* Icon based on type */}
                      <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl items-center justify-center">
                        <Text className="text-2xl">
                          {resource.type === 'article'
                            ? '📄'
                            : resource.type === 'video'
                            ? '🎥'
                            : resource.type === 'exercise'
                            ? '🧘'
                            : '🎧'}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {resource.title}
                        </Text>
                        {resource.description && (
                          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2" numberOfLines={2}>
                            {resource.description}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-2">
                          {resource.category && (
                            <View className="bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                              <Text className="text-xs text-blue-700 dark:text-blue-400 capitalize">
                                {resource.category}
                              </Text>
                            </View>
                          )}
                          {resource.estimatedMinutes && (
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {resource.estimatedMinutes} min
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* New Entry Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-white dark:bg-gray-950">
          <View className="px-6 pt-16 pb-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">New Journal Entry</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-blue-500 text-base font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Title (optional)"
              placeholderTextColor="#9CA3AF"
              value={newTitle}
              onChangeText={setNewTitle}
              className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 mb-4 text-gray-900 dark:text-white text-base"
            />

            <TextInput
              placeholder="Write your thoughts..."
              placeholderTextColor="#9CA3AF"
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 mb-6 text-gray-900 dark:text-white text-base"
              style={{ minHeight: 200 }}
            />

            <TouchableOpacity
              onPress={handleCreateEntry}
              disabled={!newContent.trim()}
              className={`py-4 rounded-2xl items-center ${
                newContent.trim() ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-800'
              }`}
              activeOpacity={0.8}>
              <Text
                className={`font-semibold text-base ${
                  newContent.trim() ? 'text-white' : 'text-gray-500 dark:text-gray-600'
                }`}>
                Save Entry
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
