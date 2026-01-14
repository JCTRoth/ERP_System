import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrashIcon, DocumentDuplicateIcon, PlusIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { UIComponent, UIRow, ComponentType, getDefaultColumnSpan, canAddToRow } from '../types';
import { useI18n } from '../../../providers/I18nProvider';
import ComponentRenderer from './ComponentRenderer';
import { getRowSlots } from '../utils/gridSnap';

interface SortableComponentProps {
  component: UIComponent;
  rowId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditScript?: () => void;
}

function SortableComponent({ 
  component, 
  rowId, 
  isSelected, 
  onSelect, 
  onDelete, 
  onDuplicate,
  onEditScript 
}: SortableComponentProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: component.id,
    data: { rowId, component }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnSpan = component.columnSpan || getDefaultColumnSpan(component.type);
  const start = component.startColumn ?? 1;
  const gridStyle = { gridColumn: `${start} / span ${columnSpan}` } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-md border-2 p-2 transition-colors ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{ ...style, ...gridStyle }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Actions */}
      <div className="absolute -top-3 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-20">
        {component.type === 'button' && onEditScript && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditScript();
            }}
            className="rounded bg-white p-1 shadow hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-blue-900"
            title="Edit Script"
          >
            <CodeBracketIcon className="h-4 w-4 text-blue-500" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded bg-white p-1 shadow hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded bg-white p-1 shadow hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900"
        >
          <TrashIcon className="h-4 w-4 text-red-500" />
        </button>
      </div>

      {/* Column span indicator */}
      <div className="absolute -top-3 left-2 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
          {columnSpan}/3
        </span>
      </div>

      {/* Component */}
      <ComponentRenderer component={component} />
    </div>
  );
}

interface SortableRowProps {
  row: UIRow;
  selectedComponent: UIComponent | null;
  onSelect: (component: UIComponent | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDeleteRow: (rowId: string) => void;
  onEditScript: (componentId: string) => void;
  activeDragType?: ComponentType | null;
  rowIndex: number;
  onInsertRowBelow?: (rowId: string) => void;
  onOpenComponentModal?: (rowId: string, slotIndex: number) => void;
}

function SortableRow({ 
  row, 
  selectedComponent, 
  onSelect, 
  onDelete, 
  onDuplicate, 
  onDeleteRow,
  onEditScript,
  activeDragType,
  rowIndex,
  onInsertRowBelow,
  onOpenComponentModal
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: row.id,
    data: { type: 'row', row }
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `row-drop-${row.id}`,
    data: { type: 'row-drop', rowId: row.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const slots = getRowSlots(row);
  
  // Check if active drag type can fit in this row
  const canFitActiveDrag = activeDragType ? canAddToRow(row, activeDragType) : true;
  const showInvalidDropZone = isOver && activeDragType && !canFitActiveDrag;
  // Whether a component in this row is selected
  const rowSelected = !!selectedComponent && row.components.some(c => c.id === selectedComponent.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row relative mb-4 ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Row Number Indicator */}
      <div className="absolute -left-8 top-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full h-6 w-6 flex items-center justify-center">
        {rowIndex + 1}
      </div>

      {/* Row Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover/row:opacity-100"
      >
        <div className="flex flex-col gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
          <div className="flex gap-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          </div>
          <div className="flex gap-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          </div>
        </div>
      </div>

      {/* Floating Buttons (Add + Delete) - stacked vertically, same size */}
      <div className={`absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity z-50 pointer-events-none ${rowSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}>
        <div className="pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onInsertRowBelow) onInsertRowBelow(row.id);
            }}
            className="h-8 w-8 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg transform hover:scale-110"
            title="Add Row"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={() => onDeleteRow(row.id)}
            className="h-8 w-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform hover:scale-110"
            title="Delete Row"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid Row */}
      <div
        ref={setDropRef}
        className={`grid grid-cols-3 gap-2 min-h-[60px] p-2 pl-12 pr-20 rounded-lg border-2 border-dashed transition-colors relative ${
          showInvalidDropZone
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
            : isOver 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        {/* Components - rendered on top of slot indicators */}
        <div className="relative z-10 contents">
          <SortableContext
            items={row.components.map(c => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {row.components.map((component) => (
              <SortableComponent
                key={component.id}
                component={component}
                rowId={row.id}
                isSelected={selectedComponent?.id === component.id}
                onSelect={() => onSelect(component)}
                onDelete={() => onDelete(component.id)}
                onDuplicate={() => onDuplicate(component.id)}
                onEditScript={() => onEditScript(component.id)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Slot indicators with add buttons for empty slots (rendered after components to be on top) */}
        <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2 rounded-lg z-30 pointer-events-none">
          {slots.map((component, idx) => (
            <div
              key={idx}
              className={`rounded transition-colors relative ${
                component
                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 pointer-events-none'
                  : 'bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 pointer-events-none'
              }`}
            >
              {!component && (
                <div className="flex items-center justify-center h-full">
                  {onOpenComponentModal && (
                    <button
                      onClick={() => {
                        console.log('Add component button clicked', { rowId: row.id, slotIndex: idx });
                        onOpenComponentModal(row.id, idx);
                      }}
                      className="pointer-events-auto rounded-full p-1 bg-primary-500 hover:bg-primary-600 text-white shadow-md transition-all transform hover:scale-110 z-40 relative"
                      title="Add component"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      
        {/* Slot indicators - background guides - REMOVED to avoid duplication */}
        
        {row.components.length === 0 && (
          <div className="col-span-3 flex items-center justify-center text-gray-400 text-sm relative z-20">
            Drop components here to add to this row
          </div>
        )}
      </div>

      {/* removed individual floating add button (now uses stacked container) */}
    </div>
  );
}

interface CanvasProps {
  rows: UIRow[];
  selectedComponent: UIComponent | null;
  onSelect: (component: UIComponent | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRow: () => void;
  onInsertRowBelow?: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onEditScript: (componentId: string) => void;
  activeDragType?: ComponentType | null;
  onOpenComponentModal?: (rowId: string, slotIndex: number) => void;
}

export default function Canvas({ 
  rows, 
  selectedComponent, 
  onSelect, 
  onDelete, 
  onDuplicate, 
  onAddRow,
  onInsertRowBelow,
  onDeleteRow,
  onEditScript,
  activeDragType,
  onOpenComponentModal
}: CanvasProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ 
    id: 'canvas',
    data: { type: 'canvas' }
  });

  return (
    <div
      ref={setNodeRef}
      className={`card h-full min-h-[400px] overflow-y-auto overflow-x-visible px-2 py-6 ${
        isOver ? 'ring-2 ring-primary-500' : ''
      }`}
      onClick={() => onSelect(null)}
    >
      {rows.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">{t('uiBuilder.emptyCanvas')}</p>
            <p className="mt-1 text-sm">{t('uiBuilder.dragComponents')}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRow();
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add First Row
          </button>
        </div>
      ) : (
        <div className="px-12">
          <SortableContext
            items={rows.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row, rowIndex) => (
              <SortableRow
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                selectedComponent={selectedComponent}
                onSelect={onSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onDeleteRow={onDeleteRow}
                onEditScript={onEditScript}
                activeDragType={activeDragType}
                onInsertRowBelow={onInsertRowBelow}
                onOpenComponentModal={onOpenComponentModal}
              />
            ))}
          </SortableContext>
          
          {/* Add Row Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRow();
            }}
            className="w-full mt-4 p-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Add Row
          </button>
        </div>
      )}
    </div>
  );
}
