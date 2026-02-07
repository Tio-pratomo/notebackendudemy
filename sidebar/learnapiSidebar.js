import { generateSession } from "../generateSession";

export const apiSidebar = {
  label: "RESTful API",
  collapsed: true,
  items: [
    {
      label: "Chapter I",
      collapsed: true,
      items: generateSession(4, "learnapi"),
    },
    {
      label: "Chapter II",
      collapsed: true,
      items: generateSession(3, "learnapi", 4),
    },
  ],
};
