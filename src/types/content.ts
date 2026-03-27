export type ContentType = "presentation" | "post" | "brief";

export interface GenerateContentInput {
  prompt: string;
  type: ContentType;
  options?: {
    tone?: string;
    audience?: string;
    length?: "short" | "medium" | "long";
  };
}

export interface GeneratedSection {
  id: string;
  title: string;
  body: string;
}

export interface GenerateContentResult {
  title: string;
  summary: string;
  sections: GeneratedSection[];
}