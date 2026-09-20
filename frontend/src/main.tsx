import { StrictMode } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { appoponiSystem } from "./theme";
import { createRoot } from "react-dom/client";
import App from "./App";

if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD
) {
  window.addEventListener(
    "load",
    () => {
      void navigator.serviceWorker
        .register("/sw.js")
        .catch(() => undefined);
    },
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={appoponiSystem}>
      <App />
    </ChakraProvider>
  </StrictMode>,
);
