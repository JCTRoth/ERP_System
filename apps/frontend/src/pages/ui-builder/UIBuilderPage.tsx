import { useState, useCallback, useEffect, useRef } from 'react';
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
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  EyeIcon,
  CodeBracketIcon,
  FolderIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import JSZip from 'jszip';
import { useI18n } from '../../providers/I18nProvider';
import { useUIBuilderStore, UIPage } from '../../stores/uiBuilderStore';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import CodeExportModal from './components/CodeExportModal';
import PageManagerModal from './components/PageManagerModal';
import ScriptEditorModal from './components/ScriptEditorModal';
import Tooltip from '../../components/Tooltip';
import { 
  UIComponent, 
  UIRow, 
  ComponentType, 
  ColumnSpan,
  getDefaultColumnSpan, 
  canAddToRow,
  getComponentDefinition,
  hasOverlap,
  COMPONENT_DEFINITIONS
} from './types';
import { generateId } from './utils';

export default function UIBuilderPage() {
  const { t } = useI18n();
  const { getCurrentPage, updatePage, addPage, currentPageId } = useUIBuilderStore();
  
  const [rows, setRows] = useState<UIRow[]>([]);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [selectedRow, setSelectedRow] = useState<UIRow | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageName, setPageName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [isPageManagerOpen, setIsPageManagerOpen] = useState(false);
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [pendingSlotInfo, setPendingSlotInfo] = useState<{ rowId: string; slotIndex: number } | null>(null);
  const [editingScriptComponentId, setEditingScriptComponentId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [activeDragType, setActiveDragType] = useState<ComponentType | null>(null);

  const getComponentTooltip = (type: ComponentType) => {
    const tooltips: Record<ComponentType, string> = {
      'text': 'Text Block - Display static or dynamic text content',
      'heading': 'Heading - Page or section title',
      'button': 'Button - Clickable action with optional script',
      'input': 'Text Input - Single-line text field for user input',
      'select': 'Dropdown - Selection from multiple options',
      'checkbox': 'Checkbox - Boolean toggle for yes/no values',
      'card': 'Card - Container for grouping related content',
      'divider': 'Divider - Visual separator between sections (full-width)',
      'spacer': 'Spacer - Add vertical spacing (full-width)',
      'image': 'Image - Display pictures or graphics',
      'table': 'Table - Display tabular data with rows and columns (full-width)',
    };
    return tooltips[type] || '';
  };

  const handleAddComponentToSlot = useCallback((componentType: ComponentType) => {
    if (!pendingSlotInfo) return;

    const { rowId, slotIndex } = pendingSlotInfo;
    const rowIdx = rows.findIndex(r => r.id === rowId);
    if (rowIdx === -1) return;

    const newComponent: UIComponent = {
      id: generateId(),
      type: componentType,
      props: getDefaultProps(componentType),
      columnSpan: 1,
      startColumn: (slotIndex + 1) as 1 | 2 | 3,
      children: [],
    };

    const newRows = rows.map((row, idx) => {
      if (idx === rowIdx) {
        return {
          ...row,
          components: [...row.components, newComponent].sort((a, b) => (a.startColumn ?? 1) - (b.startColumn ?? 1))
        };
      }
      return row;
    });

    setRows(newRows);
    setSelectedComponent(newComponent);
    setSelectedRow(rows[rowIdx]);
    setIsComponentModalOpen(false);
    setPendingSlotInfo(null);
    setHasUnsavedChanges(true);
  }, [pendingSlotInfo, rows]);

  // Load current page
  useEffect(() => {
    const page = getCurrentPage();
    if (page) {
      // Convert from legacy flat components to rows if needed
      if (page.rows && page.rows.length > 0) {
        setRows(page.rows);
      } else if (page.components && page.components.length > 0) {
        // Convert legacy format: put each component in its own row
        const convertedRows: UIRow[] = page.components.map(comp => ({
          id: generateId(),
          components: [{
            ...comp,
            columnSpan: getDefaultColumnSpan(comp.type)
          }]
        }));
        setRows(convertedRows);
      } else {
        setRows([]);
      }
      setScripts(page.scripts || {});
      setPageName(page.name);
      setHasUnsavedChanges(false);
    } else {
      setRows([]);
      setScripts({});
      setPageName('');
    }
  }, [currentPageId, getCurrentPage]);

  // Mark as having unsaved changes when rows change
  useEffect(() => {
    if (currentPageId && rows.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [rows, scripts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setIsImportDropdownOpen(false);
        setIsExportDropdownOpen(false);
      }
    };

    if (isImportDropdownOpen || isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isImportDropdownOpen, isExportDropdownOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeIdStr = event.active.id.toString();
    setActiveId(activeIdStr);
    
    // Track if dragging a palette item and its type
    if (activeIdStr.startsWith('palette-')) {
      const componentType = activeIdStr.replace('palette-', '') as ComponentType;
      setActiveDragType(componentType);
    } else {
      setActiveDragType(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragType(null);
    dragPositionRef.current = null;

    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();
    const overData = over.data?.current;

    // Dragging from palette to canvas
    if (activeIdStr.startsWith('palette-')) {
      const componentType = activeIdStr.replace('palette-', '') as ComponentType;
      const def = getComponentDefinition(componentType);
      if (!def) return;

      const newComponent: UIComponent = {
        id: generateId(),
        type: componentType,
        props: getDefaultProps(componentType),
        children: [],
        columnSpan: def.minColumns,
        startColumn: 1, // Default to column 1
      };

      // Case 1: Drop on a row area
      if (overData?.type === 'row-drop') {
        const rowId = overData.rowId;
        const targetRow = rows.find(r => r.id === rowId);
        if (!targetRow) return;

        // If there is not enough space in the row, ignore the drop
        if (!canAddToRow(targetRow, componentType)) {
          return;
        }

        // Append to the target row
        setRows(rows.map(r => 
          r.id === rowId 
            ? { ...r, components: [...r.components, newComponent] }
            : r
        ));
      }
      // Case 2: Drop on canvas (empty)
      else if (overIdStr === 'canvas' || overData?.type === 'canvas') {
        const newRow: UIRow = { id: generateId(), components: [newComponent] };
        setRows([...rows, newRow]);
      }
      // Case 3: Drop on an existing component - snap before it
      else {
        const targetComponentId = overIdStr;
        let inserted = false;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const compIndex = row.components.findIndex(c => c.id === targetComponentId);
          if (compIndex !== -1) {
            // Found the target component in this row
            if (!canAddToRow(row, componentType)) {
              // Not enough space in this row – ignore the drop
              return;
            }

            // Insert before the target component
            const newComponents = [...row.components];
            newComponents.splice(compIndex, 0, newComponent);
            setRows(rows.map((r, idx) => 
              idx === i ? { ...r, components: newComponents } : r
            ));

            inserted = true;
            break;
          }
        }

        // Fallback: component not found, create new row at end
        if (!inserted) {
          const newRow: UIRow = { id: generateId(), components: [newComponent] };
          setRows([...rows, newRow]);
        }
      }
      return;
    }

    // Reordering rows
    if (active.data?.current?.type === 'row' && over.data?.current?.type === 'row') {
      const oldIndex = rows.findIndex(r => r.id === activeIdStr);
      const newIndex = rows.findIndex(r => r.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1) {
        setRows(arrayMove(rows, oldIndex, newIndex));
      }
      return;
    }

    // Reordering components within or between rows
    const activeData = active.data?.current;
    if (activeData?.component) {
      const sourceRowId = activeData.rowId;
      const sourceRow = rows.find(r => r.id === sourceRowId);
      if (!sourceRow) return;

      // Find target row and position
      let targetRowId = overData?.rowId;
      if (overData?.type === 'row-drop') {
        targetRowId = overData.rowId;
      }

      if (!targetRowId) {
        // Check if over is a component
        for (const row of rows) {
          const compIndex = row.components.findIndex(c => c.id === overIdStr);
          if (compIndex !== -1) {
            targetRowId = row.id;
            break;
          }
        }
      }

      if (!targetRowId) return;

      const targetRow = rows.find(r => r.id === targetRowId);
      if (!targetRow) return;

      const movingComponent = activeData.component as UIComponent;

      // Same row - reorder
      if (sourceRowId === targetRowId) {
        const oldIndex = sourceRow.components.findIndex(c => c.id === activeIdStr);
        const newIndex = sourceRow.components.findIndex(c => c.id === overIdStr);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setRows(rows.map(r => 
            r.id === sourceRowId 
              ? { ...r, components: arrayMove(r.components, oldIndex, newIndex) }
              : r
          ));
        }
      } else {
        // Different rows - move component
        // Check if it fits in target row
        const targetRowWithoutMoving = {
          ...targetRow,
          components: targetRow.components
        };
        
        if (canAddToRow(targetRowWithoutMoving, movingComponent.type)) {
          // Remove from source, add to target
          setRows(rows.map(r => {
            if (r.id === sourceRowId) {
              return { ...r, components: r.components.filter(c => c.id !== activeIdStr) };
            }
            if (r.id === targetRowId) {
              const overIndex = r.components.findIndex(c => c.id === overIdStr);
              const newComponents = [...r.components];
              if (overIndex !== -1) {
                newComponents.splice(overIndex, 0, movingComponent);
              } else {
                newComponents.push(movingComponent);
              }
              return { ...r, components: newComponents };
            }
            return r;
          }).filter(r => r.components.length > 0)); // Remove empty rows
        }
      }
    }
  };

  const handleSelectComponent = (component: UIComponent | null) => {
    console.log('handleSelectComponent called', { component });
    setSelectedComponent(component);
    if (component) {
      const row = rows.find(r => r.components.some(c => c.id === component.id));
      setSelectedRow(row || null);
    } else {
      setSelectedRow(null);
    }
  };

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UIComponent>) => {
    setRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        components: row.components.map((c) => {
          if (c.id === id) {
            const updated = { ...c, ...updates };
            if (updates.columnSpan) {
              updated.columnSpan = Math.max(1, updates.columnSpan) as ColumnSpan;
            }
            return updated;
          }
          return c;
        }),
      }))
    );
    if (selectedComponent?.id === id) {
      setSelectedComponent((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        if (updates.columnSpan) {
          updated.columnSpan = Math.max(1, updates.columnSpan) as ColumnSpan;
        }
        return updated;
      });
    }
  }, [selectedComponent]);

  const handleDeleteComponent = useCallback((id: string) => {
    setRows((prevRows) => 
      prevRows
        .map((row) => ({
          ...row,
          components: row.components.filter((c) => c.id !== id),
        }))
        .filter((row) => row.components.length > 0) // Remove empty rows
    );
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
    // Also remove script if exists
    setScripts((prev) => {
      const newScripts = { ...prev };
      delete newScripts[id];
      return newScripts;
    });
  }, [selectedComponent]);

  const handleDuplicateComponent = useCallback((id: string) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      for (let i = 0; i < newRows.length; i++) {
        const compIndex = newRows[i].components.findIndex(c => c.id === id);
        if (compIndex !== -1) {
          const component = newRows[i].components[compIndex];
          const newComponent: UIComponent = {
            ...component,
            id: generateId(),
          };
          
          // Check if duplicate fits in same row
          const rowWithoutOriginal = {
            ...newRows[i],
            components: newRows[i].components.filter(c => c.id !== id)
          };
          
          if (canAddToRow(rowWithoutOriginal, component.type)) {
            // Add to same row after original
            newRows[i] = {
              ...newRows[i],
              components: [
                ...newRows[i].components.slice(0, compIndex + 1),
                newComponent,
                ...newRows[i].components.slice(compIndex + 1),
              ],
            };
          } else {
            // Create new row after current row
            const newRow: UIRow = { id: generateId(), components: [newComponent] };
            newRows.splice(i + 1, 0, newRow);
          }
          break;
        }
      }
      return newRows;
    });
  }, []);

  const handleAddRow = useCallback(() => {
    const newRow: UIRow = { id: generateId(), components: [] };
    setRows((prev) => [...prev, newRow]);
  }, []);

  const handleDeleteRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter(r => r.id !== rowId));
  }, []);

  const handleEditScript = useCallback((componentId: string) => {
    setEditingScriptComponentId(componentId);
    setIsScriptEditorOpen(true);
  }, []);

  const handleSaveScript = useCallback((script: string) => {
    if (editingScriptComponentId) {
      setScripts((prev) => ({
        ...prev,
        [editingScriptComponentId]: script,
      }));
      // Also update the component
      handleUpdateComponent(editingScriptComponentId, { script });
    }
  }, [editingScriptComponentId, handleUpdateComponent]);

  const handleMoveComponent = useCallback((componentId: string, targetRowId: string, startColumn: number) => {
    // Work with the current rows snapshot so we can update selection after the move
    const newRows = rows.map(r => ({ ...r, components: [...r.components] }));

    // Find component and its current row
    let sourceRowIdx = -1;
    let componentToMove: UIComponent | null = null;
    
    for (let i = 0; i < newRows.length; i++) {
      const comp = newRows[i].components.find(c => c.id === componentId);
      if (comp) {
        sourceRowIdx = i;
        componentToMove = comp;
        break;
      }
    }

    // If component not found, abort
    if (!componentToMove || sourceRowIdx === -1) return;

    // Find target row
    const targetRowIdx = newRows.findIndex(r => r.id === targetRowId);
    if (targetRowIdx === -1) return;

    const targetRow = newRows[targetRowIdx];
    const span = componentToMove.columnSpan || getDefaultColumnSpan(componentToMove.type);

    // Validate that the new position doesn't overlap with other components
    if (hasOverlap(targetRow, startColumn, span, componentId)) {
      alert('This position overlaps with another component.');
      return;
    }

    // Validate that the component fits in the row (startColumn + span - 1 <= 3)
    if (startColumn + span - 1 > 3) {
      alert('Component does not fit at this column position.');
      return;
    }

    // Update the component's startColumn
    componentToMove.startColumn = startColumn as 1 | 2 | 3;

    // If moving to a different row, remove from source
    if (sourceRowIdx !== targetRowIdx) {
      newRows[sourceRowIdx].components = newRows[sourceRowIdx].components.filter(c => c.id !== componentId);
      targetRow.components.push(componentToMove);
    }

    // Remove empty rows
    const compacted = newRows.filter(r => r.components.length > 0);

    // Apply changes and update selection so the UI reflects new position
    setRows(compacted);
    const newRow = compacted.find(r => r.components.some(c => c.id === componentId)) || null;
    const newComponent = newRow ? newRow.components.find(c => c.id === componentId) || null : null;
    setSelectedComponent(newComponent);
    setSelectedRow(newRow);
    setHasUnsavedChanges(true);
  }, [rows]);


  const handleSave = () => {
    // Flatten components for backward compatibility
    const flatComponents = rows.flatMap(r => r.components);
    
    if (!currentPageId) {
      // Create new page
      const newPage = addPage({
        name: pageName || 'Untitled Page',
        slug: (pageName || 'untitled-page').toLowerCase().replace(/\s+/g, '-'),
        components: flatComponents,
        rows,
        scripts,
      });
      setPageName(newPage.name);
    } else {
      // Update existing page
      updatePage(currentPageId, { 
        components: flatComponents, 
        rows,
        scripts,
        name: pageName 
      });
    }
    setHasUnsavedChanges(false);
  };

  const handleSelectPage = (page: UIPage) => {
    if (page.rows && page.rows.length > 0) {
      setRows(page.rows);
    } else {
      // Convert from legacy format
      const convertedRows: UIRow[] = page.components.map(comp => ({
        id: generateId(),
        components: [{
          ...comp,
          columnSpan: getDefaultColumnSpan(comp.type)
        }]
      }));
      setRows(convertedRows);
    }
    setScripts(page.scripts || {});
    setPageName(page.name);
    setHasUnsavedChanges(false);
  };

  const handleImportJSON = () => {
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
            if (data.rows && Array.isArray(data.rows)) {
              setRows(data.rows);
              setScripts(data.scripts || {});
              if (data.name) setPageName(data.name);
              setHasUnsavedChanges(true);
            } else if (Array.isArray(data)) {
              // Legacy: array of components
              const convertedRows: UIRow[] = data.map((comp: UIComponent) => ({
                id: generateId(),
                components: [{
                  ...comp,
                  columnSpan: getDefaultColumnSpan(comp.type)
                }]
              }));
              setRows(convertedRows);
              setHasUnsavedChanges(true);
            } else if (data.components && Array.isArray(data.components)) {
              // Legacy: object with components array
              const convertedRows: UIRow[] = data.components.map((comp: UIComponent) => ({
                id: generateId(),
                components: [{
                  ...comp,
                  columnSpan: getDefaultColumnSpan(comp.type)
                }]
              }));
              setRows(convertedRows);
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

  const handleImportZIP = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const zip = await JSZip.loadAsync(file);
          
          // Read page.json
          const pageFile = zip.file('page.json');
          if (!pageFile) {
            throw new Error('No page.json found in ZIP');
          }
          
          const pageData = JSON.parse(await pageFile.async('string'));
          
          // Read scripts
          const importedScripts: Record<string, string> = {};
          const scriptsFolder = zip.folder('scripts');
          if (scriptsFolder) {
            const scriptFiles = Object.keys(zip.files).filter(f => f.startsWith('scripts/') && f.endsWith('.js'));
            for (const scriptPath of scriptFiles) {
              const scriptFile = zip.file(scriptPath);
              if (scriptFile) {
                const componentId = scriptPath.replace('scripts/', '').replace('.js', '');
                importedScripts[componentId] = await scriptFile.async('string');
              }
            }
          }
          
          // Apply imported data
          if (pageData.rows && Array.isArray(pageData.rows)) {
            setRows(pageData.rows);
          } else if (pageData.components && Array.isArray(pageData.components)) {
            const convertedRows: UIRow[] = pageData.components.map((comp: UIComponent) => ({
              id: generateId(),
              components: [{
                ...comp,
                columnSpan: getDefaultColumnSpan(comp.type)
              }]
            }));
            setRows(convertedRows);
          }
          
          setScripts({ ...pageData.scripts, ...importedScripts });
          if (pageData.name) setPageName(pageData.name);
          setHasUnsavedChanges(true);
          
        } catch (err) {
          alert(`Import error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    };
    input.click();
  };

  const handleExportZIP = async () => {
    const zip = new JSZip();
    
    // Add page.json
    const pageData = {
      name: pageName,
      slug: pageName.toLowerCase().replace(/\s+/g, '-'),
      rows,
      scripts,
      exportedAt: new Date().toISOString(),
    };
    zip.file('page.json', JSON.stringify(pageData, null, 2));
    
    // Add scripts folder
    const scriptsFolder = zip.folder('scripts');
    if (scriptsFolder) {
      Object.entries(scripts).forEach(([componentId, script]) => {
        if (script) {
          scriptsFolder.file(`${componentId}.js`, script);
        }
      });
    }
    
    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageName || 'ui-page'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get editing component info for script editor
  const editingComponent = editingScriptComponentId 
    ? rows.flatMap(r => r.components).find(c => c.id === editingScriptComponentId)
    : null;

  // (components are derived from rows when needed)

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
          
          {/* Import dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
              className="btn-secondary flex items-center gap-2"
              title={t('uiBuilder.import')}
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              Import
            </button>
            {isImportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border dark:border-gray-700 z-10">
                <button
                  onClick={() => {
                    handleImportJSON();
                    setIsImportDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Import JSON
                </button>
                <button
                  onClick={() => {
                    handleImportZIP();
                    setIsImportDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Import ZIP (with scripts)
                </button>
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="btn-secondary flex items-center gap-2"
              title={t('uiBuilder.exportCode')}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export
            </button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border dark:border-gray-700 z-10">
                <button
                  onClick={() => {
                    setIsCodeExportOpen(true);
                    setIsExportDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  <CodeBracketIcon className="h-4 w-4 inline mr-2" />
                  Export as Code
                </button>
                <button
                  onClick={() => {
                    handleExportZIP();
                    setIsExportDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Export ZIP (with scripts)
                </button>
              </div>
            )}
          </div>

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
          {/* Center - Canvas */}
          <div className="flex-1 overflow-auto">
            <Canvas
              rows={rows}
              selectedComponent={selectedComponent}
              onSelect={handleSelectComponent}
              onDelete={handleDeleteComponent}
              onDuplicate={handleDuplicateComponent}
              onAddRow={handleAddRow}
              onInsertRowBelow={(rowId: string) => {
                // Insert a new empty row after the given rowId
                setRows((prev) => {
                  const idx = prev.findIndex(r => r.id === rowId);
                  const newRow: UIRow = { id: generateId(), components: [] };
                  if (idx === -1) return [...prev, newRow];
                  const copy = [...prev];
                  copy.splice(idx + 1, 0, newRow);
                  return copy;
                });
              }}
              onDeleteRow={handleDeleteRow}
              onEditScript={handleEditScript}
              activeDragType={activeDragType}
              onOpenComponentModal={(rowId, slotIndex) => {
                setPendingSlotInfo({ rowId, slotIndex });
                setIsComponentModalOpen(true);
              }}
            />
          </div>

          {/* Right Panel - Properties */}
          <div className="w-72 flex-shrink-0">
            <PropertiesPanel
              component={selectedComponent}
              row={selectedRow}
              rows={rows}
              onUpdate={handleUpdateComponent}
              onEditScript={handleEditScript}
              onMoveComponent={handleMoveComponent}
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
        rows={rows}
        pageName={pageName}
        scripts={scripts}
      />
      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
        rows={rows}
      />
      <PageManagerModal
        isOpen={isPageManagerOpen}
        onClose={() => setIsPageManagerOpen(false)}
        onSelectPage={handleSelectPage}
      />
      {editingComponent && (
        <ScriptEditorModal
          isOpen={isScriptEditorOpen}
          onClose={() => {
            setIsScriptEditorOpen(false);
            setEditingScriptComponentId(null);
          }}
          componentId={editingComponent.id}
          componentLabel={(editingComponent.props.label as string) || 'Button'}
          script={scripts[editingComponent.id] || ''}
          onSave={handleSaveScript}
        />
      )}

      {/* Component Selection Modal */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('uiBuilder.selectComponent')}</h2>
              <button
                onClick={() => {
                  setIsComponentModalOpen(false);
                  setPendingSlotInfo(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              {[
                { key: 'basic', label: t('uiBuilder.basicComponents') },
                { key: 'form', label: t('uiBuilder.formComponents') },
                { key: 'layout', label: t('uiBuilder.layoutComponents') },
                { key: 'data', label: t('uiBuilder.dataComponents') },
              ].map((category) => {
                const categoryComponents = COMPONENT_DEFINITIONS.filter(
                  (d) => d.category === category.key
                );
                
                if (categoryComponents.length === 0) return null;
                
                return (
                  <div key={category.key} className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {category.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryComponents.map((definition) => (
                        <Tooltip key={definition.type} content={getComponentTooltip(definition.type)} position="top">
                          <button
                            onClick={() => handleAddComponentToSlot(definition.type)}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-primary-500 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-primary-500 dark:hover:bg-gray-600"
                          >
                            <span className="text-2xl">{definition.icon}</span>
                            <span className="font-medium">{definition.label}</span>
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
      return { columns: ['Column 1', 'Column 2'], rows: 3 };
    default:
      return {};
  }
}
