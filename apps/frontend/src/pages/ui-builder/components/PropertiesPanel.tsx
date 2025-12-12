import { UIComponent, ComponentType } from '../types';
import { useI18n } from '../../../providers/I18nProvider';

interface PropertiesPanelProps {
  component: UIComponent | null;
  onUpdate: (id: string, updates: Partial<UIComponent>) => void;
}

export default function PropertiesPanel({ component, onUpdate }: PropertiesPanelProps) {
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
      props: { ...component.props, [key] },
    });
  };

  return (
    <div className="card h-full overflow-y-auto p-4">
      <h3 className="mb-4 font-semibold">{t('uiBuilder.properties')}</h3>

      <div className="mb-4">
        <label className="label mb-1">{t('uiBuilder.componentType')}</label>
        <p className="text-sm font-medium capitalize">{component.type}</p>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        {renderPropertiesForType(component.type, component.props, updateProp, t)}
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
          <div>
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
          <div>
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

    case 'card':
      return (
        <div>
          <label className="label mb-1">{t('uiBuilder.title')}</label>
          <input
            type="text"
            value={(props.title as string) || ''}
            onChange={(e) => onUpdate('title', e.target.value)}
            className="input"
          />
        </div>
      );

    default:
      return (
        <p className="text-sm text-gray-500">
          {t('uiBuilder.noProperties')}
        </p>
      );
  }
}
