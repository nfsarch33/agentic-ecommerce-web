import type { Metadata } from "next";

interface PageMetadataInput {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
}

const indexableRobots = {
  index: true,
  follow: true,
} as const;

const privateRobots = {
  index: false,
  follow: false,
} as const;

function buildMetadata(input: PageMetadataInput, robots: Metadata["robots"]): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.canonical,
    },
    robots,
  };
}

export function publicPageMetadata(input: PageMetadataInput): Metadata {
  return buildMetadata(input, indexableRobots);
}

export function privatePageMetadata(input: PageMetadataInput): Metadata {
  return buildMetadata(input, privateRobots);
}

export function adminPageMetadata(input: PageMetadataInput): Metadata {
  return privatePageMetadata(input);
}
