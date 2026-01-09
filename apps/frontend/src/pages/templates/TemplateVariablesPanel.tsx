interface TemplateVariablesPanelProps {
  variables: Record<string, any>;
  contextSelected?: boolean;
  mainObjectType?: string;
  isEditingTemplate?: boolean;
}

export default function TemplateVariablesPanel({
  variables,
  contextSelected = false,
  mainObjectType = 'order',
  isEditingTemplate = false,
}: TemplateVariablesPanelProps) {
  // Show helpful message if context not yet selected (unless editing)
  if (!contextSelected && !isEditingTemplate) {
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        Select a main object type above to see available variables for this template.
      </div>
    );
  }

  return (
    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
      {Object.entries(variables).map(([category, vars]) => (
        <div key={category} className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">{category}</div>
          {typeof vars === 'object' ? (
            <ul className="ml-2 space-y-1">
              {Object.keys(vars).map((variable) => (
                <li
                  key={variable}
                  className="cursor-pointer rounded px-2 py-1 font-mono hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => {
                    const placeholder = `{{${category}.${variable}}}`;
                    navigator.clipboard.writeText(placeholder);
                  }}
                  title={`Click to copy: {{${category}.${variable}}}`}
                >
                  {`{{${category}.${variable}}}`}
                </li>
              ))}
            </ul>
          ) : (
            <li className="ml-2 cursor-pointer rounded px-2 py-1 font-mono hover:bg-gray-200 dark:hover:bg-gray-600">
              {`{{${category}}}`}
            </li>
          )}
        </div>
      ))}
    </div>
  );
}

