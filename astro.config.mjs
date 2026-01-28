// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

import { dataLesson } from "./sidebar/dataLesson";

// https://astro.build/config
export default defineConfig({
  integrations: [
    mermaid({
      theme: "forest",
    }),
    starlight({
      title: "Backend by Angela Yu",
      sidebar: dataLesson,
    }),
  ],
});
