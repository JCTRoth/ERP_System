import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { apolloClient } from './lib/apollo';
import { I18nProvider } from './providers/I18nProvider';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <I18nProvider>
          <App />
          <Toaster position="top-right" />
        </I18nProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);
