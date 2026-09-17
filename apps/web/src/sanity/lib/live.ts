import { defineLive } from "next-sanity/live";
import { client, isSanityConfigured } from "./client";

const { sanityFetch: liveFetch, SanityLive: LiveComponent } = defineLive({
  client: client.withConfig({ apiVersion: "2026-02-01" }),
  serverToken: isSanityConfigured ? process.env.SANITY_API_READ_TOKEN : undefined,
});

export const sanityFetch: typeof liveFetch = (async (...args: Parameters<typeof liveFetch>) => {
  if (!isSanityConfigured) return { data: null };
  return liveFetch(...args);
}) as typeof liveFetch;

export const SanityLive = isSanityConfigured ? LiveComponent : () => null;
