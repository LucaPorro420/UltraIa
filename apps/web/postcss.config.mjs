const config = {
  plugins: {
    '@tailwindcss/postcss': {
      content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
      ],
    },
  },
};

export default config;
