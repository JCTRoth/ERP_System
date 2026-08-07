/**
 * Grid snap-to-slot utilities for the UI Builder
 * Each row has 3 columns (slots), elements snap to discrete column positions
 */

import { UIComponent, UIRow, getDefaultColumnSpan } from '../types';

/**
 * Represents the occupied/available slots in a row
 * Each index 0-2 represents a column slot
 * Array value is the component occupying that slot or null
 */
export type RowSlots = Array<UIComponent | null>;

/**
 * Get the slot layout for a row
 * Shows which columns are occupied by which components
 */
export function getRowSlots(row: UIRow): RowSlots {
  const slots: RowSlots = [null, null, null];
  
  for (const component of row.components) {
    const spanSize = component.columnSpan || getDefaultColumnSpan(component.type);
    const startCol = (component.startColumn ?? 1) - 1; // Convert 1-based to 0-based
    
    // Mark all slots occupied by this component
    for (let j = 0; j < spanSize; j++) {
      if (startCol + j < 3) {
        slots[startCol + j] = component;
      }
    }
  }
  
  return slots;
}

