import type { Config } from "tailwindcss";

const config: Config = {
  // 👇 THIS IS THE MISSING KEY. Without it, Tailwind ignores your toggle button.
  darkMode: ["class"], 
  
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // Ensures your new components are found
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;