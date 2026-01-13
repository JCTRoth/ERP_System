/**
 * Grid snap-to-slot utilities for the UI Builder
 * Each row has 3 columns (slots), elements snap to discrete column positions
 */

import { UIComponent, UIRow, getDefaultColumnSpan, ColumnSpan } from '../types';

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

/**
 * Get available column positions where a component can be inserted
 * Returns an array of {startColumn, endColumn, componentId} for occupied regions
 */
export interface SlotRegion {
  component: UIComponent;
  startColumn: number;
  endColumn: number; // exclusive
  rowId: string;
}

export function getSlotRegions(row: UIRow): SlotRegion[] {
  const slots = getRowSlots(row);
  const regions: SlotRegion[] = [];
  
  for (let i = 0; i < 3; i++) {
    if (slots[i] !== null && slots[i] !== undefined) {
      const component = slots[i] as UIComponent;
      // Find the end of this component's span
      let endColumn = i + 1;
      while (endColumn < 3 && slots[endColumn] === component) {
        endColumn++;
      }
      
      // Only add once per component
      if (!regions.some(r => r.component.id === component.id)) {
        regions.push({
          component,
          startColumn: i,
          endColumn,
          rowId: row.id,
        });
      }
    }
  }
  
  return regions;
}

/**
 * Calculate snap position for a component being dragged over a row
 * Returns the column index where the component should snap
 */
export interface SnapPosition {
  column: number; // 0, 1, or 2 - the starting column for the snapped component
  rowId: string;
  insertBeforeComponentId?: string; // If snapping before an existing component
  createNewRow?: boolean; // If there's no room in this row
}

export function calculateSnapPosition(
  row: UIRow,
  draggedComponentSpan: ColumnSpan,
  mouseX: number,
  rowElement: HTMLElement | null
): SnapPosition | null {
  if (!rowElement) {
    return { column: 0, rowId: row.id, createNewRow: false };
  }

  // Get bounding info
  const rowRect = rowElement.getBoundingClientRect();
  const relativeX = mouseX - rowRect.left;
  const columnWidth = rowRect.width / 3;
  
  // Calculate which column the mouse is over
  let snapColumn = Math.floor(relativeX / columnWidth);
  snapColumn = Math.max(0, Math.min(2, snapColumn)); // Clamp to 0-2
  
  // Check if component can fit at this position
  const slots = getRowSlots(row);
  const canFit = snapColumn + draggedComponentSpan <= 3 &&
    slots.slice(snapColumn, snapColumn + draggedComponentSpan).every(s => s === null);
  
  if (canFit) {
    // Find if we're snapping before an existing component
    let insertBeforeComponentId: string | undefined;
    if (slots[snapColumn]) {
      insertBeforeComponentId = slots[snapColumn]!.id;
    }
    
    return {
      column: snapColumn,
      rowId: row.id,
      insertBeforeComponentId,
      createNewRow: false,
    };
  }
  
  // Can't fit - signal to create new row
  return {
    column: 0,
    rowId: row.id,
    createNewRow: true,
  };
}

/**
 * Get visual grid lines/guides for rendering
 * Shows where columns are and which areas are occupied
 */
export interface GridGuide {
  column: number; // 0, 1, or 2
  width: number; // percentage
  isOccupied: boolean;
  occupiedBy?: UIComponent;
}

export function getGridGuides(row: UIRow): GridGuide[] {
  const slots = getRowSlots(row);
  
  return [
    {
      column: 0,
      width: 33.33,
      isOccupied: slots[0] !== null,
      occupiedBy: slots[0] ?? undefined,
    },
    {
      column: 1,
      width: 33.33,
      isOccupied: slots[1] !== null,
      occupiedBy: slots[1] ?? undefined,
    },
    {
      column: 2,
      width: 33.33,
      isOccupied: slots[2] !== null,
      occupiedBy: slots[2] ?? undefined,
    },
  ];
}
