import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrossCode: Control Your OpenCode Agent from Anywhere",
    short_name: "CrossCode",
    description:
      "Your OpenCode agent in your pocket. Approve tool calls, review diffs and manage sessions from anywhere.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon-light-mode.png",
        sizes: "768x768",
        type: "image/png",
      },
      {
        src: "/icon-dark-mode.png",
        sizes: "768x768",
        type: "image/png",
      },
    ],
  };
}
