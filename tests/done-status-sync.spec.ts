import { describe, expect, it } from "vitest";
import { resolveDoneStatus } from "../src/done-status-sync";

describe("resolveDoneStatus", () => {
	it("does nothing when status and checkbox agree", () => {
		expect(resolveDoneStatus(undefined, { status: "Done", done: true })).toBeNull();
		expect(resolveDoneStatus(undefined, { status: "In progress", done: false })).toBeNull();
	});

	it("sets status to Done when the checkbox is ticked", () => {
		expect(
			resolveDoneStatus({ status: "In progress", done: false }, { status: "In progress", done: true }),
		).toEqual({ status: "Done", done: true });
	});

	it("reopens the task when the checkbox is cleared", () => {
		expect(
			resolveDoneStatus({ status: "Done", done: true }, { status: "Done", done: false }),
		).toEqual({ status: "Not started", done: false });
	});

	it("ticks the checkbox when status becomes Done", () => {
		expect(
			resolveDoneStatus({ status: "Not started", done: false }, { status: "Done", done: false }),
		).toEqual({ status: "Done", done: true });
	});

	it("clears the checkbox when status moves away from Done", () => {
		expect(
			resolveDoneStatus({ status: "Done", done: true }, { status: "Skipped", done: true }),
		).toEqual({ status: "Skipped", done: false });
	});

	it("treats an unknown mismatch as done", () => {
		expect(resolveDoneStatus(undefined, { status: "Not started", done: true })).toEqual({
			status: "Done",
			done: true,
		});
	});
});
