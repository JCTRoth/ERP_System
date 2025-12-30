import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { UIComponent } from '../types';
import { useI18n } from '../../../providers/I18nProvider';
import ComponentRenderer from './ComponentRenderer';

interface SortableComponentProps {
  component: UIComponent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableComponent({ component, isSelected, onSelect, onDelete, onDuplicate }: SortableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-md border-2 p-2 transition-colors ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-4 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
      >
        <div className="flex flex-col gap-0.5">
          <div className="h-1 w-1 rounded-full bg-gray-400" />
          <div className="h-1 w-1 rounded-full bg-gray-400" />
          <div className="h-1 w-1 rounded-full bg-gray-400" />
        </div>
      </div>

      {/* Actions */}
      <div className="absolute -top-3 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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

      {/* Component */}
      <ComponentRenderer component={component} />
    </div>
  );
}

interface CanvasProps {
  components: UIComponent[];
  selectedComponent: UIComponent | null;
  onSelect: (component: UIComponent | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function Canvas({ components, selectedComponent, onSelect, onDelete, onDuplicate }: CanvasProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <div
      ref={setNodeRef}
      className={`card h-full min-h-[400px] overflow-y-auto p-6 ${
        isOver ? 'ring-2 ring-primary-500' : ''
      }`}
      onClick={() => onSelect(null)}
    >
      {components.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">{t('uiBuilder.emptyCanvas')}</p>
            <p className="mt-1 text-sm">{t('uiBuilder.dragComponents')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {components.map((component) => (
            <SortableComponent
              key={component.id}
              component={component}
              isSelected={selectedComponent?.id === component.id}
              onSelect={() => onSelect(component)}
              onDelete={() => onDelete(component.id)}
              onDuplicate={() => onDuplicate(component.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
