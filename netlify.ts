// netlify-plugin.ts
import { Plugin } from 'vite'

export default function netlifyPlugin(): Plugin {
  return {
    name: 'netlify-plugin',
    configureServer() {
      // Add any dev server configurations if needed
    },
    transformIndexHtml(html) {
      // Add any HTML transformations if needed
      return html;
    }
  }
}