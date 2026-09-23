import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "잇룸",
    short_name: "잇룸",
    description: "초대받은 사람들이 IT 소식과 생각을 나누는 공간, 잇룸.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#161616",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
