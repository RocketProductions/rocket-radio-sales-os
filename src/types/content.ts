export type ContentType = "presentation" | "post" | "brief";

export interface GenerateContentInput {
  prompt: string;
  type: ContentType;
  tenantId?: string;
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

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: "admin" | "manager" | "executive" | "client";
  passwordHash: string;
  createdAt: string;
}

export interface AuthPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: User["role"];
}
