import { generateSession } from "../generateSession";

export const postgreSidebar = {
  label: "PostgreSQL",
  collapsed: true,
  items: [
    {
      label: "Chapter I",
      collapsed: true,
      items: generateSession(4, "postgre"),
    },
    {
      label: "Chapter II",
      collapsed: true,
      items: generateSession(4, "postgre", 4),
    },
    {
      label: "Chapter III",
      collapsed: true,
      items: generateSession(4, "postgre", 8),
    },
  ],
};
