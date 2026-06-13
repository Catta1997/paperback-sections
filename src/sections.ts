import { EditableListForm, getDiscoverySectionsOrder } from "./settings.js";
import { DiscoverSection } from "@paperback/types";

export class SectionsOrder {
  sections: { id: string; title: string }[] = [];
  discoverySections: Record<string, DiscoverSection> = {};
  constructor(sections: Record<string, DiscoverSection>) {
    this.sections = Object.values(sections).map(({ id, title }) => ({
      id,
      title,
    }));
    this.discoverySections = sections;
  }
  getSettings = new EditableListForm(this.sections);
  getSections() {
    return getDiscoverySectionsOrder(this.sections)
      .map((key) => this.discoverySections[key.id])
      .filter(Boolean);
  }
}
