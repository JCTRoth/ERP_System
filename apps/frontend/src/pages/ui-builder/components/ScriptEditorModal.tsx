import { useState, useEffect } from 'react';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';

interface ScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentId: string;
  componentLabel: string;
  script: string;
  onSave: (script: string) => void;
}

export default function ScriptEditorModal({
  isOpen,
  onClose,
  componentId,
  componentLabel,
  script,
  onSave,
}: ScriptEditorModalProps) {
  const [code, setCode] = useState(script || '');
  const [testOutput, setTestOutput] = useState<string>('');
  const [testError, setTestError] = useState<string>('');

  useEffect(() => {
    setCode(script || getDefaultScript());
  }, [script, componentId]);

  if (!isOpen) return null;

  const getDefaultScript = () => `// Button click handler
// Available variables:
//   - event: The click event
//   - componentId: "${componentId}"
//   - document: DOM document
//   - console: For logging

console.log('Button "${componentLabel}" clicked!');

// Example: Show an alert
// alert('Hello from button!');

// Example: Update another element
// const element = document.getElementById('some-id');
// if (element) element.textContent = 'Updated!';

// Example: Make an API call
// fetch('/api/data').then(res => res.json()).then(console.log);
`;

  const handleTest = () => {
    setTestOutput('');
    setTestError('');
    
    const logs: string[] = [];
    const mockConsole = {
      log: (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' ')),
      warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
      error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
    };

    try {
      // Create a sandboxed function
      const fn = new Function(
        'event', 
        'componentId', 
        'console', 
        'alert',
        `
        ${code}
        `
      );
      
      // Run with mock objects
      fn(
        { type: 'click', target: null },
        componentId,
        mockConsole,
        (msg: string) => logs.push(`[ALERT] ${msg}`)
      );
      
      setTestOutput(logs.join('\n') || 'Script executed successfully (no output)');
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSave = () => {
    onSave(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">
              Script Editor - {componentLabel}
            </h2>
            <p className="text-sm text-gray-500">
              Write JavaScript code that runs when this button is clicked
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          {/* Code Editor */}
          <div className="mb-4">
            <label className="label mb-2 flex items-center justify-between">
              <span>JavaScript Code</span>
              <button
                onClick={handleTest}
                className="btn-secondary flex items-center gap-1 text-sm py-1 px-2"
              >
                <PlayIcon className="h-4 w-4" />
                Test
              </button>
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input font-mono text-sm min-h-[300px] bg-gray-900 text-green-400"
              spellCheck={false}
              placeholder="// Write your JavaScript code here..."
            />
          </div>

          {/* Test Output */}
          {(testOutput || testError) && (
            <div className="mb-4">
              <label className="label mb-2">Test Output</label>
              <div className={`p-3 rounded-md font-mono text-sm ${
                testError 
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                <pre className="whitespace-pre-wrap">
                  {testError || testOutput}
                </pre>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              Available APIs
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">event</code> - The click event object</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">componentId</code> - This button's ID</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">document</code> - DOM document for element manipulation</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">fetch()</code> - Make API calls</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">console.log()</code> - Log messages</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">alert()</code> - Show alerts</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Script
          </button>
        </div>
      </div>
    </div>
  );
}
