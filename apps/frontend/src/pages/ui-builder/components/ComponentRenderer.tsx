import { UIComponent } from '../types';

interface ComponentRendererProps {
  component: UIComponent;
}

export default function ComponentRenderer({ component }: ComponentRendererProps) {
  const { type, props } = component;

  switch (type) {
    case 'text':
      return (
        <p className={`text-${props.variant === 'body' ? 'base' : 'sm'}`}>
          {props.content as string}
        </p>
      );

    case 'heading':
      const HeadingTag = (props.level as string) || 'h2';
      const headingClasses: Record<string, string> = {
        h1: 'text-3xl font-bold',
        h2: 'text-2xl font-bold',
        h3: 'text-xl font-semibold',
        h4: 'text-lg font-semibold',
        h5: 'text-base font-medium',
        h6: 'text-sm font-medium',
      };
      return (
        <div className={headingClasses[HeadingTag as string] || headingClasses.h2}>
          {props.content as string}
        </div>
      );

    case 'button':
      const buttonVariants: Record<string, string> = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        outline: 'btn-outline',
        danger: 'btn-danger',
      };
      return (
        <button className={buttonVariants[(props.variant as string) || 'primary']}>
          {props.label && typeof props.label === 'string' ? props.label : 'Button'}
        </button>
      );

    case 'input':
      const inputLabel = typeof props.label === 'string' ? props.label : undefined;
      return (
        <div>
          {inputLabel && <label className="label mb-1">{inputLabel}</label>}
          <input
            type={(props.type as string) || 'text'}
            placeholder={props.placeholder as string}
            className="input"
            disabled
          />
        </div>
      );

    case 'select':
      const selectLabel = typeof props.label === 'string' ? props.label : undefined;
      return (
        <div>
          {selectLabel && <label className="label mb-1">{selectLabel}</label>}
          <select className="input" disabled>
            {((props.options as string[]) || []).map((option, i) => (
              <option key={i}>{option}</option>
            ))}
          </select>
        </div>
      );

    case 'checkbox':
      const checkboxLabel = typeof props.label === 'string' ? props.label : undefined;
      return (
        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="h-4 w-4" />
          {checkboxLabel && <label className="text-sm">{checkboxLabel}</label>}
        </div>
      );

    case 'card':
      const cardTitle = typeof props.title === 'string' ? props.title : undefined;
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
          {cardTitle && <h3 className="font-semibold">{cardTitle}</h3>}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Card content</p>
        </div>
      );

    case 'divider':
      return <hr className="border-gray-200 dark:border-gray-600" />;

    case 'spacer':
      return <div style={{ height: (props.height as number) || 24 }} />;

    case 'image':
      return (
        <div className="flex h-32 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
          {props.src ? (
            <img
              src={props.src as string}
              alt={props.alt as string}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-4xl">🖼️</span>
          )}
        </div>
      );

    case 'table':
      const columns = (props.columns as string[]) || ['Column 1', 'Column 2'];
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-2 text-left text-sm font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-600">
                {columns.map((_, i) => (
                  <td key={i} className="px-4 py-2 text-sm text-gray-500">
                    Sample data
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );

    default:
      return <div className="text-gray-500">Unknown component: {type}</div>;
  }
}
