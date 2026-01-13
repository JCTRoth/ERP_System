import { UIComponent, UIRow, ComponentType, ComponentStyling, ColumnSpan, getComponentDefinition, getAvailableColumnSpans, getDefaultColumnSpan, getUsedColumnsInRow, getAvailableStartColumns } from '../types';
import { useI18n } from '../../../providers/I18nProvider';
import { CodeBracketIcon } from '@heroicons/react/24/outline';

interface PropertiesPanelProps {
  component: UIComponent | null;
  row?: UIRow | null;
  rows?: UIRow[];
  onUpdate: (id: string, updates: Partial<UIComponent>) => void;
  onEditScript?: (componentId: string) => void;
  onMoveComponent?: (componentId: string, targetRowId: string, startColumn: number) => void;
}

export default function PropertiesPanel({ component, row, rows = [], onUpdate, onEditScript, onMoveComponent }: PropertiesPanelProps) {
  const { t } = useI18n();

  if (!component) {
    return (
      <div className="card flex h-full items-center justify-center p-4">
        <p className="text-center text-gray-500">
          {t('uiBuilder.selectComponent')}
        </p>
      </div>
    );
  }

  const updateProp = (key: string, value: unknown) => {
    onUpdate(component.id, {
      props: { ...component.props, [key]: value },
    });
  };

  const updateStyling = (key: keyof ComponentStyling, value: string) => {
    onUpdate(component.id, {
      styling: { ...component.styling, [key]: value },
    });
  };

  const updateColumnSpan = (span: ColumnSpan) => {
    onUpdate(component.id, { columnSpan: span });
  };

  // Find current row and start column
  const currentRowIndex = rows.findIndex(r => r.components.some(c => c.id === component.id));
  const currentRow = rows[currentRowIndex] || row;
  const currentStartColumn = component.startColumn ?? 1;

  // Get available column spans for this component
  const availableSpans = currentRow 
    ? getAvailableColumnSpans(currentRow, component)
    : [1, 2, 3] as ColumnSpan[];
  
  const currentSpan = component.columnSpan || getDefaultColumnSpan(component.type);
  const def = getComponentDefinition(component.type);

  // Placeholder component used to test insertion availability
  const placeholder: UIComponent = { ...component, id: '__placeholder__' };

  // For each row determine if inserting this component at column 1 would be valid
  const rowsAvailability = rows.map((r) => {
    const tempRow: UIRow = { ...r, components: [placeholder, ...r.components] };
    const used = getUsedColumnsInRow(tempRow);
    return used <= 3;
  });

  // For current row, get available start column positions
  const availableStartColumns: (1 | 2 | 3)[] = currentRow && currentRowIndex >= 0 ?
    getAvailableStartColumns(currentRow, component) : [];

  return (
    <div className="card h-full overflow-y-auto p-4">
      <h3 className="mb-4 font-semibold">{t('uiBuilder.properties')}</h3>

      <div className="mb-4">
        <label className="label mb-1">{t('uiBuilder.componentType')}</label>
        <p className="text-sm font-medium capitalize">{component.type}</p>
      </div>

      {/* Script editor shortcut for button components */}
      {component.type === 'button' && onEditScript && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">Script</span>
          <button
            type="button"
            onClick={() => onEditScript(component.id)}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            title="Edit client-side script"
          >
            <CodeBracketIcon className="h-4 w-4" />
            <span>Open Editor</span>
          </button>
        </div>
      )}

      {/* Row and Position Selector */}
      {rows.length > 0 && (
        <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="mb-3">
            <label className="label mb-1">{t('uiBuilder.selectRow')}</label>
            <select
              value={currentRowIndex >= 0 ? currentRowIndex : ''}
              onChange={(e) => {
                const newRowIndex = parseInt(e.target.value);
                if (onMoveComponent && newRowIndex >= 0) {
                  onMoveComponent(component.id, rows[newRowIndex].id, 0);
                }
              }}
              className="input text-sm w-full"
            >
              <option value="" disabled>
                Select a row
              </option>
              {rows.map((r, idx) => (
                <option
                  key={r.id}
                  value={idx}
                  disabled={!rowsAvailability[idx]}
                  title={!rowsAvailability[idx] ? t('uiBuilder.notEnoughSpace') : ''}
                >
                  {t('uiBuilder.row')} {idx + 1}
                </option>
              ))}
            </select>
          </div>

          {currentRow && (
            <div>
              <label className="label mb-1">{t('uiBuilder.startColumn')}</label>
              <select
                value={currentStartColumn}
                onChange={(e) => {
                  const newStartColumn = parseInt(e.target.value) as 1 | 2 | 3;
                  if (onMoveComponent && currentRow) {
                    onMoveComponent(component.id, currentRow.id, newStartColumn);
                  }
                }}
                className="input text-sm w-full"
              >
                {[1, 2, 3].map((col) => {
                  const isAvailable = availableStartColumns.includes(col as 1 | 2 | 3);
                  const endColumn = col + currentSpan - 1;
                  
                  return (
                    <option
                      key={col}
                      value={col}
                      disabled={!isAvailable}
                      title={!isAvailable ? t('uiBuilder.notEnoughSpaceDetail') : ''}
                    >
                      Column {col} {endColumn > col ? `- ${endColumn}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Column Size Section */}
      <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <label className="label mb-2">Column Size</label>
        <div className="flex gap-2">
          {[1, 2, 3].map((span) => {
            const isAvailable = availableSpans.includes(span as ColumnSpan);
            const isWithinLimits = def && span >= def.minColumns && span <= def.maxColumns;
            const isDisabled = !isAvailable || !isWithinLimits;
            
            return (
              <button
                key={span}
                onClick={() => !isDisabled && updateColumnSpan(span as ColumnSpan)}
                disabled={isDisabled}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  currentSpan === span
                    ? 'bg-primary-500 text-white'
                    : isDisabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isDisabled ? 'Not available for this component type or row space' : `${span} column${span > 1 ? 's' : ''}`}
              >
                {span}/3
              </button>
            );
          })}
        </div>
        {def && (
          <p className="mt-1 text-xs text-gray-500">
            Allowed: {def.minColumns === def.maxColumns 
              ? `${def.minColumns} column${def.minColumns > 1 ? 's' : ''} only`
              : `${def.minColumns}-${def.maxColumns} columns`}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        {renderPropertiesForType(component.type, component.props, updateProp, t)}
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4 dark:border-gray-700">
        <h4 className="mb-3 font-medium text-sm">{t('uiBuilder.styling') || 'Styling'}</h4>
        {renderStylingProperties(component.styling || {}, updateStyling)}
      </div>
    </div>
  );
}

function renderPropertiesForType(
  type: ComponentType,
  props: Record<string, unknown>,
  onUpdate: (key: string, value: unknown) => void,
  t: (key: string) => string
) {
  switch (type) {
    case 'text':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.content')}</label>
            <textarea
              value={(props.content as string) || ''}
              onChange={(e) => onUpdate('content', e.target.value)}
              className="input min-h-[80px]"
            />
          </div>
          <div>
            <label className="label mb-1">{t('uiBuilder.variant')}</label>
            <select
              value={(props.variant as string) || 'body'}
              onChange={(e) => onUpdate('variant', e.target.value)}
              className="input"
            >
              <option value="body">Body</option>
              <option value="small">Small</option>
            </select>
          </div>
        </>
      );

    case 'heading':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.content')}</label>
            <input
              type="text"
              value={(props.content as string) || ''}
              onChange={(e) => onUpdate('content', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label mb-1">{t('uiBuilder.level')}</label>
            <select
              value={(props.level as string) || 'h2'}
              onChange={(e) => onUpdate('level', e.target.value)}
              className="input"
            >
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
            </select>
          </div>
        </>
      );

    case 'button':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.label')}</label>
            <input
              type="text"
              value={(props.label as string) || ''}
              onChange={(e) => onUpdate('label', e.target.value)}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.variant')}</label>
            <select
              value={(props.variant as string) || 'primary'}
              onChange={(e) => onUpdate('variant', e.target.value)}
              className="input"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
              <option value="danger">Danger</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={props.disabled === true}
                onChange={(e) => onUpdate('disabled', e.target.checked)}
              />
              <span className="text-sm">Disabled</span>
            </label>
          </div>
        </>
      );

    case 'input':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.label')}</label>
            <input
              type="text"
              value={(props.label as string) || ''}
              onChange={(e) => onUpdate('label', e.target.value)}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.placeholder')}</label>
            <input
              type="text"
              value={(props.placeholder as string) || ''}
              onChange={(e) => onUpdate('placeholder', e.target.value)}
              className="input"
            />
          </div>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.inputType')}</label>
            <select
              value={(props.type as string) || 'text'}
              onChange={(e) => onUpdate('type', e.target.value)}
              className="input"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="password">Password</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={props.required === true}
                onChange={(e) => onUpdate('required', e.target.checked)}
              />
              <span className="text-sm">Required</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={props.disabled === true}
                onChange={(e) => onUpdate('disabled', e.target.checked)}
              />
              <span className="text-sm">Disabled</span>
            </label>
          </div>
        </>
      );

    case 'spacer':
      return (
        <div>
          <label className="label mb-1">{t('uiBuilder.height')} (px)</label>
          <input
            type="number"
            value={(props.height as number) || 24}
            onChange={(e) => onUpdate('height', parseInt(e.target.value, 10))}
            className="input"
            min={0}
            max={200}
          />
        </div>
      );

    case 'image':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.imageUrl')}</label>
            <input
              type="url"
              value={(props.src as string) || ''}
              onChange={(e) => onUpdate('src', e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label mb-1">{t('uiBuilder.altText')}</label>
            <input
              type="text"
              value={(props.alt as string) || ''}
              onChange={(e) => onUpdate('alt', e.target.value)}
              className="input"
            />
          </div>
        </>
      );

    case 'table':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">Columns (comma-separated)</label>
            <textarea
              value={((props.columns as string[]) || []).join(', ')}
              onChange={(e) => onUpdate('columns', e.target.value.split(',').map(o => o.trim()))}
              className="input min-h-[60px]"
            />
          </div>
          <div className="mb-4">
            <label className="label mb-1">Number of Rows</label>
            <input
              type="number"
              value={(props.rows as number) || 3}
              onChange={(e) => onUpdate('rows', parseInt(e.target.value, 10))}
              className="input"
              min={1}
              max={20}
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={props.sampleData === true}
                onChange={(e) => onUpdate('sampleData', e.target.checked)}
              />
              <span className="text-sm">Show Sample Data</span>
            </label>
          </div>
        </>
      );

    case 'card':
      return (
        <>
          <div className="mb-4">
            <label className="label mb-1">{t('uiBuilder.title')}</label>
            <input
              type="text"
              value={(props.title as string) || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label mb-1">Description</label>
            <textarea
              value={(props.description as string) || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              className="input min-h-[60px]"
            />
          </div>
        </>
      );

    default:
      return (
        <p className="text-sm text-gray-500">
          {t('uiBuilder.noProperties')}
        </p>
      );
  }
}

function renderStylingProperties(
  styling: Partial<any>,
  onUpdate: (key: any, value: string) => void
) {
  return (
    <>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Padding (e.g., "0.5rem")</label>
        <input
          type="text"
          value={styling.padding || ''}
          onChange={(e) => onUpdate('padding', e.target.value)}
          placeholder="0.5rem"
          className="input text-sm"
        />
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Margin (e.g., "0.5rem")</label>
        <input
          type="text"
          value={styling.margin || ''}
          onChange={(e) => onUpdate('margin', e.target.value)}
          placeholder="0.5rem"
          className="input text-sm"
        />
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Background Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={styling.backgroundColor || '#ffffff'}
            onChange={(e) => onUpdate('backgroundColor', e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <input
            type="text"
            value={styling.backgroundColor || ''}
            onChange={(e) => onUpdate('backgroundColor', e.target.value)}
            placeholder="#ffffff"
            className="input text-sm flex-1"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Text Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={styling.textColor || '#000000'}
            onChange={(e) => onUpdate('textColor', e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <input
            type="text"
            value={styling.textColor || ''}
            onChange={(e) => onUpdate('textColor', e.target.value)}
            placeholder="#000000"
            className="input text-sm flex-1"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Font Size (e.g., "1rem")</label>
        <input
          type="text"
          value={styling.fontSize || ''}
          onChange={(e) => onUpdate('fontSize', e.target.value)}
          placeholder="1rem"
          className="input text-sm"
        />
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Border Radius (e.g., "0.375rem")</label>
        <input
          type="text"
          value={styling.borderRadius || ''}
          onChange={(e) => onUpdate('borderRadius', e.target.value)}
          placeholder="0.375rem"
          className="input text-sm"
        />
      </div>
      <div className="mb-3">
        <label className="label mb-1 text-xs">Width (e.g., "100%")</label>
        <input
          type="text"
          value={styling.width || ''}
          onChange={(e) => onUpdate('width', e.target.value)}
          placeholder="100%"
          className="input text-sm"
        />
      </div>
    </>
  );
}
