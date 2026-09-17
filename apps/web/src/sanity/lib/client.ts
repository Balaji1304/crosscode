import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const isSanityConfigured =
  !!projectId && projectId !== "placeholder-project" && projectId !== "";

export const client = createClient({
  projectId: isSanityConfigured ? projectId : "placeholder-project",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-02-01",
  useCdn: true,
  stega: { studioUrl: "/studio" },
});
