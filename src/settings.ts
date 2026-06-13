import {
	ButtonRow,
	EditSection,
	Form,
	FormConfirmationError,
	type FormItemElement,
	type FormSectionElement,
	LabelRow,
	Section,
} from "@paperback/types";


function getDeletedDiscoverySections() {
	return (
		(Application.getState("deleted_sections") as { id: string; title: string }[] | undefined) ?? []
	);
}

async function setDiscoverySections(newValue: { id: string; title: string }[]) {
	Application.setState(newValue, "sections");
}

async function setDeletedDiscoverySections(newValue: { id: string; title: string }[]) {
	Application.setState(newValue, "deleted_sections");
}

export function getDiscoverySectionsOrder(allSections:{ id: string; title: string }[]) {
	return (
		(Application.getState("sections") as { id: string; title: string }[] | undefined) ??
		allSections
	);
}

abstract class BaseSettings extends Form {
	protected async updateValue<T>(value: T, id: string): Promise<void> {
		Application.setState(value, id);
		Application.invalidateDiscoverSections();
		this.reloadForm();
	}
}

export class EditableListForm extends Form {
	constructor(allSections:{ id: string; title: string }[]) {
		super();
		this.allSections = allSections;

	}
	private allSections: { id: string; title: string }[];
	override getSections() {
		const onReorderSelectorId = Application.Selector(this as EditableListForm, "rowDidReorder");
		const onDeletionSelectorId = Application.Selector(this as EditableListForm, "rowDidDelete");

		return [
			{
				...EditSection("edit", {
					id: "edit",
					header: "Section order",
					footer: "Long press to reorder, swipe to hide",
					items: getDiscoverySectionsOrder(this.allSections).map((item) => this.itemRow(item)),
				}),
				allowDeletion: true,
				allowReorder: true,
				onReorder: onReorderSelectorId,
				onDeletion: onDeletionSelectorId,
			} as unknown as FormSectionElement<unknown>,
			...(getDeletedDiscoverySections().length > 0
				? [new AddSectionSelect(this.allSections).getDeletedSections()]
				: []),
			Section("status", [
				ButtonRow("reset", {
					title: "Reset all Sections",
					isHidden: getDeletedDiscoverySections().length == 0,
					onSelect: Application.Selector(this as EditableListForm, "resetFiltersDialog"),
				}),
			]),
		];
	}
	async resetFiltersDialog() {
		throw new FormConfirmationError(
			Application.Selector(this as EditableListForm, "handleLimitStatusChangeReset"),
			"Do you want to restore all deleted sections?",
		);
	}
	async handleLimitStatusChangeReset(): Promise<void> {
		await setDiscoverySections(this.allSections);
		await setDeletedDiscoverySections([]);
		this.reloadForm();
	}
	private itemRow(item: { id: string; title: string }): FormItemElement<unknown> {
		return LabelRow(item.id, {
			title: item.title,
		});
	}

	async rowDidDelete(index: number): Promise<void> {
		const items = getDeletedDiscoverySections();
		const sections = getDiscoverySectionsOrder(this.allSections);
		const deleted = sections.splice(index, 1);
		deleted.forEach((item) => {
			items.push(item);
		});
		await setDeletedDiscoverySections(items);
		await setDiscoverySections(sections);
		this.reloadForm();
	}

	async rowDidReorder(sourceIndex: number, destinationIndex: number): Promise<void> {
		const sections = getDiscoverySectionsOrder(this.allSections);
		const [item] = sections.splice(sourceIndex, 1);
		if (item) {
			sections.splice(destinationIndex, 0, item);
		}
		await setDiscoverySections(sections);
		this.reloadForm();
		Application.invalidateDiscoverSections();
	}
}

class AddSectionSelect {
	constructor(allSections:{ id: string; title: string }[]) {
		this.allSections = allSections;
	}
	private allSections: { id: string; title: string }[];
	onSelectLabelProxy = new Proxy(this, {
		has(target, p) {
			if (typeof p == "string" && p.startsWith("onSelect_")) {
				return true;
			} else {
				// @ts-ignore
				return Object.hasOwn(target, p);
			}
		},
		get(target, p) {
			if (typeof p == "string" && p.startsWith("onSelect_")) {
				const rowId = p.slice(9);
				return async () => {
					await target["onSelect"](rowId);
				};
			} else {
				// @ts-ignore
				return target[p];
			}
		},
	});

	deletedForms = getDeletedDiscoverySections();
	getDeletedSections(): FormSectionElement<unknown> {
		return Section(
			{ id: "addSectionSelect", footer: "Tap to restore" },
			this.deletedForms.flatMap((item) =>
				LabelRow(item.id, {
					title: item.title,
					// @ts-expect-error
					onSelect: Application.Selector(this.onSelectLabelProxy, "onSelect_" + item.id),
				}),
			),
		);
	}

	async onSelect(rowId: string): Promise<void> {
		const sections = getDiscoverySectionsOrder(this.allSections);
		const selectedDeletedItems = this.deletedForms.filter((item) => item.id === rowId);
		sections.push(selectedDeletedItems[0]);
		await setDiscoverySections(sections);
		await setDeletedDiscoverySections(this.deletedForms.filter((item) => item.id !== rowId));
		this.deletedForms = getDeletedDiscoverySections();
	}
}