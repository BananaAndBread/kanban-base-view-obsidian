import { TFile, type Plugin } from "obsidian";

const STATUS = "Task Status";
const DONE = "Done?";
const DONE_VALUE = "Done";
const DEFAULT_OPEN_STATUS = "Not started";

export interface DoneStatusState {
	status: string;
	done: boolean;
}

export function isDoneStatusConsistent(state: DoneStatusState): boolean {
	return (state.status === DONE_VALUE) === state.done;
}

/**
 * Decides how to bring "Task Status" and "Done?" back in line.
 * `prev` is the last consistent state we saw for the note, if any.
 * Returns null when nothing needs to change.
 */
export function resolveDoneStatus(
	prev: DoneStatusState | undefined,
	current: DoneStatusState,
): DoneStatusState | null {
	if (isDoneStatusConsistent(current)) return null;

	if (prev && prev.status === current.status) {
		// The checkbox was toggled.
		return {
			done: current.done,
			status: current.done ? DONE_VALUE : DEFAULT_OPEN_STATUS,
		};
	}

	if (prev && prev.done === current.done) {
		// The status was changed.
		return { done: current.status === DONE_VALUE, status: current.status };
	}

	// No history: a ticked box or a Done status means the task is done.
	return { done: true, status: DONE_VALUE };
}

function readState(plugin: Plugin, file: TFile): DoneStatusState | null {
	const frontmatter: Record<string, unknown> | undefined =
		plugin.app.metadataCache.getFileCache(file)?.frontmatter;
	if (!frontmatter || !(STATUS in frontmatter)) return null;
	const rawStatus = frontmatter[STATUS];
	return {
		status: typeof rawStatus === "string" ? rawStatus : "",
		done: frontmatter[DONE] === true,
	};
}

export function registerDoneStatusSync(plugin: Plugin): void {
	const lastSeen = new Map<string, DoneStatusState>();

	const check = async (file: TFile): Promise<void> => {
		const current = readState(plugin, file);
		if (!current) return;
		const next = resolveDoneStatus(lastSeen.get(file.path), current);
		if (!next) {
			lastSeen.set(file.path, current);
			return;
		}
		lastSeen.set(file.path, next);
		await plugin.app.fileManager.processFrontMatter(
			file,
			(frontmatter: Record<string, unknown>) => {
				frontmatter[STATUS] = next.status;
				frontmatter[DONE] = next.done;
			},
		);
	};

	plugin.app.workspace.onLayoutReady(() => {
		for (const file of plugin.app.vault.getMarkdownFiles()) {
			const state = readState(plugin, file);
			if (state && isDoneStatusConsistent(state)) lastSeen.set(file.path, state);
		}
		plugin.registerEvent(
			plugin.app.metadataCache.on("changed", (file) => {
				if (file instanceof TFile) void check(file);
			}),
		);
		plugin.registerEvent(
			plugin.app.vault.on("rename", (file, oldPath) => {
				const state = lastSeen.get(oldPath);
				if (!state) return;
				lastSeen.delete(oldPath);
				lastSeen.set(file.path, state);
			}),
		);
	});
}
