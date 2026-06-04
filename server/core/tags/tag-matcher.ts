import { AhoCorasick } from "@monyone/aho-corasick/greedy";
import { prisma } from "@server/db";
import { regionMatcher } from "@server/pkgs/regions/region-matcher";

export class TagMatcher {
  private keywordToTag = new Map<string, string>();
  private ac = new AhoCorasick([]);
  private loadPromise: Promise<void> | null = null;

  private async load(): Promise<void> {
    const tags = await prisma.tag.findMany();
    const keywordToTag = new Map<string, string>();
    for (const tag of tags) {
      for (const keyword of tag.keywords) {
        keywordToTag.set(keyword.toLowerCase(), tag.name);
      }
    }
    this.keywordToTag = keywordToTag;
    this.ac = new AhoCorasick([...keywordToTag.keys()]);
  }

  async ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    await this.loadPromise;
  }

  refresh(): void {
    this.loadPromise = null;
  }

  match(text: string): string[] {
    const hits = this.ac.matchInText(text.toLowerCase());
    const tags = new Set<string>();
    for (const hit of hits) {
      const tag = this.keywordToTag.get(hit.keyword);
      if (tag) tags.add(tag);
    }
    for (const t of regionMatcher.match(text)) tags.add(t);
    return [...tags];
  }
}

export const tagMatcher = new TagMatcher();
