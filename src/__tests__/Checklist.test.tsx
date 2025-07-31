import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import Checklist from '../components/Checklist';
import { ChecklistItem } from '../types';

describe('Checklist Component', () => {
  const mockItems: ChecklistItem[] = [
    {
      id: '1',
      text: 'Test item 1',
      completed: false,
      createdDate: '2024-01-01',
    },
    {
      id: '2',
      text: 'Test item 2',
      completed: true,
      createdDate: '2024-01-02',
    },
  ];

  const mockOnItemsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with items', () => {
    render(
      <Checklist
        items={mockItems}
        onItemsChange={mockOnItemsChange}
        title="Test Checklist"
      />
    );

    expect(screen.getByText('Test Checklist')).toBeTruthy();
    expect(screen.getByText('Test item 1')).toBeTruthy();
    expect(screen.getByText('Test item 2')).toBeTruthy();
    expect(screen.getByText('1 of 2 completed')).toBeTruthy();
  });

  it('renders empty state when no items', () => {
    render(
      <Checklist
        items={[]}
        onItemsChange={mockOnItemsChange}
      />
    );

    expect(screen.getByText('No items yet')).toBeTruthy();
    expect(screen.getByText('Add your first item above')).toBeTruthy();
  });

  it('allows adding new items when editable', () => {
    render(
      <Checklist
        items={[]}
        onItemsChange={mockOnItemsChange}
        editable={true}
      />
    );

    const input = screen.getByPlaceholderText('Add new item...');
    const addButton = screen.getByText('Add');

    fireEvent.changeText(input, 'New test item');
    fireEvent.press(addButton);

    expect(mockOnItemsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        text: 'New test item',
        completed: false,
      }),
    ]);
  });

  it('does not show add controls when not editable', () => {
    render(
      <Checklist
        items={mockItems}
        onItemsChange={mockOnItemsChange}
        editable={false}
      />
    );

    expect(screen.queryByPlaceholderText('Add new item...')).toBeNull();
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('shows correct progress count', () => {
    const allCompletedItems: ChecklistItem[] = [
      { id: '1', text: 'Item 1', completed: true, createdDate: '2024-01-01' },
      { id: '2', text: 'Item 2', completed: true, createdDate: '2024-01-02' },
    ];

    render(
      <Checklist
        items={allCompletedItems}
        onItemsChange={mockOnItemsChange}
      />
    );

    expect(screen.getByText('2 of 2 completed')).toBeTruthy();
  });

  it('does not add empty items', () => {
    render(
      <Checklist
        items={[]}
        onItemsChange={mockOnItemsChange}
        editable={true}
      />
    );

    const addButton = screen.getByText('Add');
    fireEvent.press(addButton);

    expect(mockOnItemsChange).not.toHaveBeenCalled();
  });
});