import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  EyeIcon,
  CodeBracketIcon,
  FolderIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useUIBuilderStore, UIPage } from '../../stores/uiBuilderStore';
import ComponentPalette from './components/ComponentPalette';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import CodeExportModal from './components/CodeExportModal';
import PageManagerModal from './components/PageManagerModal';
import { UIComponent, ComponentType } from './types';
import { generateId } from './utils';

export default function UIBuilderPage() {
  const { t } = useI18n();
  const { getCurrentPage, updatePage, addPage, currentPageId } = useUIBuilderStore();
  
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageName, setPageName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [isPageManagerOpen, setIsPageManagerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load current page
  useEffect(() => {
    const page = getCurrentPage();
    if (page) {
      setComponents(page.components);
      setPageName(page.name);
      setHasUnsavedChanges(false);
    } else {
      setComponents([]);
      setPageName('');
    }
  }, [currentPageId, getCurrentPage]);

  // Mark as having unsaved changes when components change
  useEffect(() => {
    if (currentPageId) {
      setHasUnsavedChanges(true);
    }
  }, [components]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // If dragging from palette to canvas
    if (active.id.toString().startsWith('palette-')) {
      const componentType = active.id.toString().replace('palette-', '') as ComponentType;
      const newComponent: UIComponent = {
        id: generateId(),
        type: componentType,
        props: getDefaultProps(componentType),
        children: [],
      };
      setComponents([...components, newComponent]);
      return;
    }

    // If reordering within canvas
    if (active.id !== over.id) {
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setComponents(arrayMove(components, oldIndex, newIndex));
      }
    }
  };

  const handleSelectComponent = (component: UIComponent | null) => {
    setSelectedComponent(component);
  };

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UIComponent>) => {
    setComponents((prevComponents) =>
      prevComponents.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    );
    if (selectedComponent?.id === id) {
      setSelectedComponent((prev) => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedComponent]);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents((prevComponents) => prevComponents.filter((c) => c.id !== id));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  const handleDuplicateComponent = useCallback((id: string) => {
    const component = components.find((c) => c.id === id);
    if (component) {
      const newComponent: UIComponent = {
        ...component,
        id: generateId(),
      };
      const index = components.findIndex((c) => c.id === id);
      const newComponents = [...components];
      newComponents.splice(index + 1, 0, newComponent);
      setComponents(newComponents);
    }
  }, [components]);

  const handleSave = () => {
    if (!currentPageId) {
      // Create new page
      const newPage = addPage({
        name: pageName || 'Untitled Page',
        slug: (pageName || 'untitled-page').toLowerCase().replace(/\s+/g, '-'),
        components,
      });
      setPageName(newPage.name);
    } else {
      // Update existing page
      updatePage(currentPageId, { components, name: pageName });
    }
    setHasUnsavedChanges(false);
  };

  const handleSelectPage = (page: UIPage) => {
    setComponents(page.components);
    setPageName(page.name);
    setHasUnsavedChanges(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (Array.isArray(data)) {
              setComponents(data);
              setHasUnsavedChanges(true);
            } else if (data.components && Array.isArray(data.components)) {
              setComponents(data.components);
              if (data.name) setPageName(data.name);
              setHasUnsavedChanges(true);
            }
          } catch {
            alert(t('uiBuilder.importError'));
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('uiBuilder.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('uiBuilder.subtitle')}
            </p>
          </div>
          {currentPageId && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pageName}
                onChange={(e) => {
                  setPageName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="input text-lg font-medium"
                placeholder={t('uiBuilder.pageName')}
              />
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-500">
                  ({t('uiBuilder.unsaved')})
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPageManagerOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderIcon className="h-5 w-5" />
            {t('uiBuilder.pages')}
          </button>
          <button
            onClick={handleImport}
            className="btn-secondary flex items-center gap-2"
            title={t('uiBuilder.import')}
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsCodeExportOpen(true)}
            className="btn-secondary flex items-center gap-2"
            title={t('uiBuilder.exportCode')}
          >
            <CodeBracketIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <EyeIcon className="h-5 w-5" />
            {t('uiBuilder.preview')}
          </button>
          <button onClick={handleSave} className="btn-primary">
            {t('uiBuilder.save')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Left Panel - Component Palette */}
          <div className="w-64 flex-shrink-0">
            <ComponentPalette />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 overflow-auto">
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Canvas
                components={components}
                selectedComponent={selectedComponent}
                onSelect={handleSelectComponent}
                onDelete={handleDeleteComponent}
                onDuplicate={handleDuplicateComponent}
              />
            </SortableContext>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-72 flex-shrink-0">
            <PropertiesPanel
              component={selectedComponent}
              onUpdate={handleUpdateComponent}
            />
          </div>
        </div>

        <DragOverlay>
          {activeId && activeId.startsWith('palette-') && (
            <div className="rounded-md bg-primary-100 px-4 py-2 shadow-lg">
              {activeId.replace('palette-', '')}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        components={components}
        pageName={pageName}
      />
      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
        components={components}
      />
      <PageManagerModal
        isOpen={isPageManagerOpen}
        onClose={() => setIsPageManagerOpen(false)}
        onSelectPage={handleSelectPage}
      />
    </div>
  );
}

function getDefaultProps(type: ComponentType): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { content: 'Text content', variant: 'body' };
    case 'heading':
      return { content: 'Heading', level: 'h2' };
    case 'button':
      return { label: 'Button', variant: 'primary' };
    case 'input':
      return { label: 'Input', placeholder: 'Enter text...', type: 'text' };
    case 'select':
      return { label: 'Select', options: ['Option 1', 'Option 2'] };
    case 'checkbox':
      return { label: 'Checkbox' };
    case 'card':
      return { title: 'Card Title' };
    case 'divider':
      return {};
    case 'spacer':
      return { height: 24 };
    case 'image':
      return { src: '', alt: 'Image' };
    case 'table':
      return { columns: ['Column 1', 'Column 2'], rows: [] };
    default:
      return {};
  }
}
