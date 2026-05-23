import { prisma } from "@server/db";

export class TagMatcher {
  static async loadDb() {
    const tags = await prisma.tag.findMany();
    const keywords: string[] = [];
    const keywordToTag = new Map<string, string>();
    for (const tag of tags) {
      for (const keyword of tag.keywords) {
        keywordToTag.set(keyword, tag.name);
        keywords.push(keyword);
      }
    }
    return new TagMatcher(keywords, keywordToTag);
  }

  constructor(
    private readonly keywords: string[],
    private readonly keywordToTag: Map<string, string>,
  ) {}

  match(text: string): string | null {
    for (const keyword of this.keywords) {
      if (text.toLowerCase().includes(keyword)) {
        return this.keywordToTag.get(keyword) ?? "";
      }
    }
    return null;
  }
}
