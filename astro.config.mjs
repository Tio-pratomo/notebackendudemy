// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

// https://astro.build/config
export default defineConfig({
  integrations: [
    mermaid({
      theme: "forest",
    }),
    starlight({
      title: "Backend by Angela Yu",
      sidebar: [
        {
          label: "Express.js dan Backend Fundamentals",
          collapsed: true,
          autogenerate: { directory: "Express.jsDanBackendFundamentals" },
        },
        {
          label: "Introduction to APIs",
          collapsed: true,
          autogenerate: { directory: "IntroductionToAPIs" },
        },
      ],
    }),
  ],
});
