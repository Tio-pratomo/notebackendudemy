import { generateSession } from "../generateSession";

export const expressSidebar = {
  label: " Express.js & Backend Foundations",
  collapsed: true,
  items: [
    {
      label: "Chapter I",
      collapsed: true,
      items: generateSession(4, "expressjs"),
    },
    {
      label: "Chapter II",
      collapsed: true,
      items: generateSession(4, "expressjs", 4),
    },
    {
      label: "Chapter III",
      collapsed: true,
      items: generateSession(6, "expressjs", 8),
    },
  ],
};
