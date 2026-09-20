import {
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";

const appoponiConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        green: {
          50: { value: "#f2f7f4" },
          100: { value: "#e3efe8" },
          200: { value: "#c5dfcf" },
          300: { value: "#9bc7ac" },
          400: { value: "#5d9d76" },
          500: { value: "#287a48" },

          // Canonical Appoponi green
          600: { value: "#126932" },
          700: { value: "#126932" },

          800: { value: "#0d5126" },
          900: { value: "#093b1b" },
          950: { value: "#052611" },
        },
      },
    },
  },
});

export const appoponiSystem = createSystem(
  defaultConfig,
  appoponiConfig,
);
