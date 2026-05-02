import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { client } from "./lib/apollo";
import { CartProvider } from "./context/CartContext";
import { I18nProvider } from "./context/I18nContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <I18nProvider>
          <CartProvider>
            <App />
            <Toaster position="bottom-right" />
          </CartProvider>
        </I18nProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);
