interface TemplateVariablesPanelProps {
  variables: Record<string, any>;
  contextSelected?: boolean;
  isEditingTemplate?: boolean;
}

export default function TemplateVariablesPanel({
  variables,
  contextSelected = false,
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

  // Enhanced info message with usage examples
  const infoMessage = (
    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
      <p className="font-medium">📝 Template Variables Guide</p>
      <ul className="mt-2 space-y-1 pl-4">
        <li>• Use <code className="font-mono bg-green-100 px-1 dark:bg-green-900">{'{{order.number}}'}</code> for simple variables</li>
        <li>• Use <code className="font-mono bg-green-100 px-1 dark:bg-green-900">{'{{#order.items}}...{{/order.items}}'}</code> for loops</li>
        <li>• Click any variable below to copy it to clipboard</li>
        <li>• Hover over variables to see their full syntax</li>
      </ul>
      <p className="mt-2 font-medium">💡 Common Examples:</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <code className="cursor-pointer rounded bg-green-100 px-2 py-1 font-mono hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
              onClick={() => navigator.clipboard.writeText('{{order.number}}')}
              title="Click to copy">
          {'{{order.number}}'}
        </code>
        <code className="cursor-pointer rounded bg-green-100 px-2 py-1 font-mono hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
              onClick={() => navigator.clipboard.writeText('{{customer.name}}')}
              title="Click to copy">
          {'{{customer.name}}'}
        </code>
        <code className="cursor-pointer rounded bg-green-100 px-2 py-1 font-mono hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
              onClick={() => navigator.clipboard.writeText('{{company.name}}')}
              title="Click to copy">
          {'{{company.name}}'}
        </code>
      </div>
    </div>
  );

  return (
    <div className="mt-3 space-y-2">
      {infoMessage}
      <div className="max-h-64 space-y-2 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
        {Object.entries(variables).map(([category, vars]) => (
          <div key={category} className="space-y-1">
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {category === 'order' ? '📋 Order' : ''}
              {category === 'company' ? '🏢 Company' : ''}
              {category === 'customer' ? '👤 Customer' : ''}
              {category}
            </div>
            {typeof vars === 'object' ? (
              <ul className="ml-2 space-y-1">
                {Object.entries(vars).map(([variable, type]) => (
                  <li
                    key={variable}
                    className="group flex cursor-pointer items-center gap-2 rounded px-2 py-1 font-mono hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => {
                      const placeholder = `{{${category}.${variable}}}`;
                      navigator.clipboard.writeText(placeholder);
                    }}
                    title={`Click to copy: {{${category}.${variable}}}
Type: ${type}
Example: ${getExampleValue(category, variable)}`}
                  >
                    <span className="text-blue-500">{'{{'}</span>
                    <span className="text-gray-800 dark:text-gray-200">{category}.{variable}</span>
                    <span className="text-blue-500">{'}}'}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                      {typeof type === 'string' ? type : 'object'}
                    </span>
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
    </div>
  );
}

// Helper function to get example values for variables
function getExampleValue(category: string, variable: string): string {
  const examples: Record<string, Record<string, string>> = {
    order: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      number: 'ORD-001',
      date: '2023-01-15T10:30:00Z',
      status: 'CONFIRMED',
      subtotal: '100.00',
      tax: '19.00',
      shipping: '5.99',
      total: '124.99',
      trackingNumber: 'TRK123456789'
    },
    company: {
      name: 'Acme Corp',
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
      country: 'USA',
      email: 'info@acme.com',
      phone: '+1 212-555-1234'
    },
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 555-123-4567'
    }
  };
  return examples[category]?.[variable] || 'value';
}

