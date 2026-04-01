/**
 * Radio Script Frameworks
 * Source: Federated Media / 95.3 MNC internal playbook
 *
 * These 55 frameworks describe structural and tonal approaches for radio spots.
 * The AI uses these to select the most effective angle for each client/offer/audience combination.
 */

export interface RadioScriptFramework {
  name: string;
  description: string;
}

export const RADIO_SCRIPT_FRAMEWORKS: RadioScriptFramework[] = [
  {
    name: "Narrative-Driven",
    description: "Engages listeners with compelling stories, making the message memorable.",
  },
  {
    name: "Call to Action (CTA) Driven",
    description: "Motivates immediate listener response, crucial for conversion.",
  },
  {
    name: "Emotional Appeal",
    description: "Connects with listeners on an emotional level, fostering brand loyalty.",
  },
  {
    name: "Testimonial",
    description: "Builds trust and credibility through real or relatable customer experiences.",
  },
  {
    name: "Humorous",
    description: "Captures attention and makes the ad memorable through laughter.",
  },
  {
    name: "Educational or Informative",
    description: "Positions the brand as an authority, providing valuable information.",
  },
  {
    name: "Scarcity and Urgency",
    description: "Creates a sense of urgency, prompting quicker decision-making.",
  },
  {
    name: "Comparative",
    description: "Highlights the product's advantages over competitors without direct naming.",
  },
  {
    name: "Question and Answer (Q&A)",
    description: "Addresses common questions or concerns, educating the audience.",
  },
  {
    name: "Slice of Life",
    description: "Presents relatable scenarios, demonstrating the product's everyday relevance.",
  },
  {
    name: "Celebrity Endorsement",
    description: "Leverages celebrity influence to enhance credibility and attention.",
  },
  {
    name: "Musical or Jingle-Based",
    description: "Enhances brand recall through catchy music or jingles.",
  },
  {
    name: "Imagery and Sensory Appeal",
    description: "Utilizes vivid descriptions to engage the listener's imagination.",
  },
  {
    name: "Interactive or Direct Address",
    description: "Engages listeners by involving them directly in the ad.",
  },
  {
    name: "Character-Driven",
    description: "Builds familiarity and engagement through recurring characters or mascots.",
  },
  {
    name: "Factual or Statistical",
    description: "Appeals to rational decision-making with hard data and evidence.",
  },
  {
    name: "Aspirational",
    description: "Appeals to listeners' aspirations, showing how the product can achieve their dreams.",
  },
  {
    name: "Contrast (Before and After)",
    description: "Demonstrates the product's impact by showing before and after scenarios.",
  },
  {
    name: "Satirical",
    description: "Engages through clever satire, critiquing common situations or products.",
  },
  {
    name: "Mystery or Suspense",
    description: "Builds intrigue, keeping listeners engaged until the end for a reveal.",
  },
  {
    name: "Parody",
    description: "Draws attention through humorous mimicry of well-known tropes or ads.",
  },
  {
    name: "Ethical Appeal",
    description: "Connects with values-oriented consumers through social responsibility messages.",
  },
  {
    name: "Seasonal or Event-based",
    description: "Ties the product to timely events or seasons for relevance.",
  },
  {
    name: "Inspirational",
    description: "Motivates through uplifting messages, associating the product with positive change.",
  },
  {
    name: "Sound Effects and Audio Landscape",
    description: "Creates an immersive audio environment for the listener.",
  },
  {
    name: "Listener Challenges or Contests",
    description: "Engages directly with listeners, encouraging participation.",
  },
  {
    name: "User-Generated Content",
    description: "Fosters authenticity and engagement by featuring content from real users.",
  },
  {
    name: "Historical or Nostalgic",
    description: "Taps into nostalgia, connecting past experiences with the present.",
  },
  {
    name: "Experiential",
    description: "Describes using the product in vivid detail, invoking imagined experiences.",
  },
  {
    name: "Philosophical or Thought-Provoking",
    description: "Engages listeners through deep, reflective messaging.",
  },
  {
    name: "Global or Cultural Connection",
    description: "Appeals to a sense of global identity or cultural pride.",
  },
  {
    name: "Fantasy or Sci-Fi",
    description: "Engages imagination through fantastical or futuristic scenarios.",
  },
  {
    name: "Public Service Announcement (PSA) Style",
    description: "Mimics PSAs to convey socially responsible messages.",
  },
  {
    name: "Bilingual or Multilingual",
    description: "Reaches diverse audiences by incorporating multiple languages.",
  },
  {
    name: "Interactive Technology Integration",
    description: "Prompts interaction through modern technology within the ad.",
  },
  {
    name: "Reverse Psychology",
    description: "Sparks interest and engagement through unexpected messaging.",
  },
  {
    name: "Eco-conscious or Sustainable Focus",
    description: "Appeals to environmentally conscious consumers.",
  },
  {
    name: "Behind-the-Scenes Glimpse",
    description: "Builds transparency and trust by showing how things are made.",
  },
  {
    name: "Limited Edition or Exclusive Release",
    description: "Creates a sense of exclusivity and urgency.",
  },
  {
    name: "Customer Journey or Lifecycle",
    description: "Illustrates the product's value across the customer's journey.",
  },
  {
    name: "Community or Local Focus",
    description: "Connects with listeners through local relevance and community involvement.",
  },
  {
    name: "Myth Busting",
    description: "Educates by debunking common myths or misconceptions.",
  },
  {
    name: "Adventure or Exploration Theme",
    description: "Invokes a sense of adventure and discovery.",
  },
  {
    name: "Personalization and Customization",
    description: "Highlights individualized options, appealing to the desire for uniqueness.",
  },
  {
    name: "Health and Wellness Focus",
    description: "Taps into the growing interest in health and wellness.",
  },
  {
    name: "Social Proof",
    description: "Utilizes awards, ratings, or popularity to reinforce credibility.",
  },
  {
    name: "Cross-promotion",
    description: "Leverages partnerships for mutual audience engagement.",
  },
  {
    name: "Guarantees and Warranties",
    description: "Reduces perceived risk, encouraging trial.",
  },
  {
    name: "Time Travel",
    description: "Engages with past or future scenarios, expanding the narrative scope.",
  },
  {
    name: "Transformation",
    description: "Focuses on life-changing benefits or impacts of the product.",
  },
  {
    name: "Comparisons to Unrelated Objects",
    description: "Creates memorable analogies with unrelated objects or concepts.",
  },
  {
    name: "Virtual Reality or Augmented Reality Invitations",
    description: "Highlights cutting-edge engagement options.",
  },
  {
    name: "Expert or Authority Endorsement",
    description: "Adds credibility through expert endorsements.",
  },
  {
    name: "Multisensory Experience",
    description: "Engages multiple senses for a rich listening experience.",
  },
];

/** Just the names, for dropdown selectors and prompt injection */
export const FRAMEWORK_NAMES = RADIO_SCRIPT_FRAMEWORKS.map((f) => f.name);

/**
 * Formatted list for injection into AI prompts.
 * Returns numbered lines like: "1. Narrative-Driven: Engages listeners with..."
 */
export function buildFrameworkList(): string {
  return RADIO_SCRIPT_FRAMEWORKS
    .map((f, i) => `${i + 1}. ${f.name}: ${f.description}`)
    .join("\n");
}
