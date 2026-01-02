interface TemplateVariablesPanelProps {
  variables: Record<string, any>;
}

export default function TemplateVariablesPanel({ variables }: TemplateVariablesPanelProps) {
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
