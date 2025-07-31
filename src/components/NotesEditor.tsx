import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

interface NotesEditorProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  title?: string;
  placeholder?: string;
  editable?: boolean;
  autoSave?: boolean;
  onAutoSave?: () => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({
  notes,
  onNotesChange,
  title = 'Notes',
  placeholder = 'Add your notes here...',
  editable = true,
  autoSave = false,
  onAutoSave,
}) => {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (text: string) => {
    setLocalNotes(text);
    setHasUnsavedChanges(text !== notes);

    if (autoSave && onAutoSave) {
      // Clear existing timeout
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeout.current = setTimeout(() => {
        onNotesChange(text);
        setHasUnsavedChanges(false);
        onAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
  };

  const handleSave = () => {
    onNotesChange(localNotes);
    setHasUnsavedChanges(false);
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setLocalNotes(notes);
            setHasUnsavedChanges(false);
            if (autoSaveTimeout.current) {
              clearTimeout(autoSaveTimeout.current);
            }
          },
        },
      ]
    );
  };

  const insertTemplate = (template: string) => {
    const newText = localNotes + (localNotes ? '\n\n' : '') + template;
    setLocalNotes(newText);
    handleTextChange(newText);
  };

  const templates = [
    { label: 'Meeting Notes', text: '📅 Meeting Date:\n👥 Attendees:\n📝 Discussion:\n✅ Action Items:' },
    { label: 'Progress Update', text: '✅ Completed:\n🔄 In Progress:\n📋 Next Steps:\n⚠️ Issues:' },
    { label: 'Client Communication', text: '📞 Contact Method:\n📅 Date:\n💬 Discussion:\n📝 Follow-up:' },
  ];

  const wordCount = localNotes.split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = localNotes.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {wordCount} words • {characterCount} characters
          </Text>
        </View>
      </View>

      {editable && (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {templates.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={styles.templateButton}
                onPress={() => insertTemplate(template.text)}
              >
                <Text style={styles.templateButtonText}>{template.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TextInput
        style={[
          styles.textInput,
          !editable && styles.readOnlyInput
        ]}
        value={localNotes}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        editable={editable}
        scrollEnabled={false}
      />

      {editable && !autoSave && hasUnsavedChanges && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>
        </View>
      )}

      {autoSave && hasUnsavedChanges && (
        <View style={styles.autoSaveIndicator}>
          <Text style={styles.autoSaveText}>Auto-saving...</Text>
        </View>
      )}

      {localNotes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notes yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {editable ? 'Start typing to add notes or use a template above' : 'Notes will appear here when added'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  toolbar: {
    marginBottom: 12,
  },
  templateButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  templateButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    maxHeight: 300,
    lineHeight: 22,
  },
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  discardButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  discardButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  autoSaveIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  autoSaveText: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default NotesEditor;