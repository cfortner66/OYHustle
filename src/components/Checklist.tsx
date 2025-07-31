import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { ChecklistItem } from '../types';

interface ChecklistProps {
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  title?: string;
  placeholder?: string;
  editable?: boolean;
}

const Checklist: React.FC<ChecklistProps> = React.memo(({
  items,
  onItemsChange,
  title = 'Checklist',
  placeholder = 'Add new item...',
  editable = true,
}) => {
  const [newItemText, setNewItemText] = useState('');

  const addItem = useCallback(() => {
    if (!newItemText.trim()) {
      Alert.alert('Error', 'Please enter item text');
      return;
    }

    const newItem: ChecklistItem = {
      id: `checklist_${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      createdDate: new Date().toISOString(),
    };

    onItemsChange([...items, newItem]);
    setNewItemText('');
  }, [newItemText, items, onItemsChange]);

  const toggleItem = useCallback((itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onItemsChange(updatedItems);
  }, [items, onItemsChange]);

  const deleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedItems = items.filter(item => item.id !== itemId);
            onItemsChange(updatedItems);
          },
        },
      ]
    );
  };

  const editItem = (itemId: string, newText: string) => {
    if (!newText.trim()) {
      Alert.alert('Error', 'Please enter item text');
      return;
    }

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, text: newText.trim() } : item
    );
    onItemsChange(updatedItems);
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <ChecklistItemComponent
      item={item}
      onToggle={toggleItem}
      onDelete={deleteItem}
      onEdit={editItem}
      editable={editable}
    />
  );

  const completedCount = useMemo(() => 
    items.filter(item => item.completed).length, 
    [items]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.progress}>
          {completedCount} of {items.length} completed
        </Text>
      </View>

      {items.length > 0 && (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          scrollEnabled={false}
        />
      )}

      {editable && (
        <View style={styles.addItemContainer}>
          <TextInput
            style={styles.input}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder={placeholder}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addItem}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No items yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {editable ? 'Add your first item above' : 'Items will appear here when added'}
          </Text>
        </View>
      )}
    </View>
  );
});

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onEdit: (itemId: string, newText: string) => void;
  editable: boolean;
}

const ChecklistItemComponent: React.FC<ChecklistItemComponentProps> = React.memo(({
  item,
  onToggle,
  onDelete,
  onEdit,
  editable,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleEdit = () => {
    onEdit(item.id, editText);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggle(item.id)}
        disabled={!editable}
      >
        <Text style={styles.checkboxText}>
          {item.completed ? '✅' : '⬜'}
        </Text>
      </TouchableOpacity>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            onSubmitEditing={handleEdit}
            onBlur={handleEdit}
            autoFocus
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEdit}>
            <Text style={styles.cancelEditButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.textContainer}>
          <TouchableOpacity
            style={styles.textTouchable}
            onPress={() => editable && setIsEditing(true)}
            disabled={!editable}
          >
            <Text
              style={[
                styles.itemText,
                item.completed && styles.completedText
              ]}
            >
              {item.text}
            </Text>
          </TouchableOpacity>

          {editable && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
});

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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textTouchable: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
  },
  cancelEditButton: {
    padding: 8,
    marginLeft: 8,
  },
  cancelEditButtonText: {
    fontSize: 16,
    color: '#f44336',
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  },
});

export default Checklist;