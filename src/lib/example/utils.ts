import type { TaskState } from './types.js';

export function formatDateString(dateString: string) {
	return new Date(dateString).toLocaleString();
}

export function isFinishedTaskState(state: TaskState) {
	if (!state) {
		return true;
	}
	const finishedStates: TaskState[] = ['completed', 'failed', 'timed-out', 'cancelled'];
	return finishedStates.includes(state);
}
