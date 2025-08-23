// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { URL } from './src/consts/pageTitles';

import vercelServerless from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
   vite: {
      plugins: [tailwindcss()],
   },

   markdown: {
      shikiConfig: {
         themes: {
            theme: 'dark-plus',
         },
      },
   },

   site: URL,
   integrations: [sitemap()],
   output: 'server',
   adapter: vercelServerless(),
});
