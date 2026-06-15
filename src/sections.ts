import { EditableListForm, getDiscoverySectionsOrder } from "./settings.js";
import { DiscoverSection } from "@paperback/types";

export class SectionsOrder {
  private readonly sections: { id: string; title: string }[] = [];
  private discoverySections: Record<string, DiscoverSection> = {};
  constructor(sections: Record<string, DiscoverSection>) {
    this.sections = Object.values(sections).map(({ id, title }) => ({
      id,
      title,
    }));
    this.discoverySections = sections;
  }
  getSettings(){
    return new EditableListForm(this.sections);
  }
  setDiscoverySections(sections: Record<string, DiscoverSection>) {
    this.discoverySections = sections;
  }
  getFilteredSections() {
    return getDiscoverySectionsOrder(this.sections)
      .map((key) => this.discoverySections[key.id])
      .filter(Boolean);
  }
}
