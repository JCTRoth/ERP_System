import { useDraggable } from '@dnd-kit/core';
import { COMPONENT_DEFINITIONS, ComponentDefinition } from '../types';
import { useI18n } from '../../../providers/I18nProvider';

interface DraggablePaletteItemProps {
  definition: ComponentDefinition;
}

function DraggablePaletteItem({ definition }: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-primary-500 dark:hover:bg-gray-600 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <span className="text-lg">{definition.icon}</span>
      <span className="text-sm">{definition.label}</span>
    </div>
  );
}

export default function ComponentPalette() {
  const { t } = useI18n();
  
  const categories = [
    { key: 'basic', label: t('uiBuilder.basicComponents') },
    { key: 'form', label: t('uiBuilder.formComponents') },
    { key: 'layout', label: t('uiBuilder.layoutComponents') },
    { key: 'data', label: t('uiBuilder.dataComponents') },
  ];

  return (
    <div className="card h-full overflow-y-auto p-4">
      <h3 className="mb-4 font-semibold">{t('uiBuilder.components')}</h3>
      
      {categories.map((category) => {
        const categoryComponents = COMPONENT_DEFINITIONS.filter(
          (d) => d.category === category.key
        );
        
        if (categoryComponents.length === 0) return null;
        
        return (
          <div key={category.key} className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              {category.label}
            </h4>
            <div className="space-y-2">
              {categoryComponents.map((definition) => (
                <DraggablePaletteItem key={definition.type} definition={definition} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
