import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { I18nProvider } from '../providers/I18nProvider';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[];
  initialEntries?: string[];
}

function AllProviders({ 
  children, 
  mocks = [] 
}: { 
  children: ReactNode; 
  mocks?: MockedResponse[];
}) {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <I18nProvider>
          {children}
        </I18nProvider>
      </BrowserRouter>
    </MockedProvider>
  );
}

export function customRender(
  ui: ReactElement,
  { mocks = [], ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders mocks={mocks}>{children}</AllProviders>
    ),
    ...options,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
