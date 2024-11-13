import type { TableHeader } from '$lib/infinitable/types.js';
import type { TaskState } from './types.js';

export const taskStateData = {
	'timed-out': {
		label: 'Timed out',
		color: 'bg-orange-600'
	},
	failed: {
		label: 'Failed',
		color: 'bg-red-700'
	},
	completed: {
		label: 'Completed',
		color: 'bg-green-700'
	},
	cancelled: {
		label: 'Canceled',
		color: 'bg-yellow-500'
	},
	queued: {
		label: 'Queued',
		color: 'bg-indigo-700'
	},
	running: {
		label: 'Running',
		color: 'bg-blue-500'
	}
} as const satisfies Record<TaskState, { label: string; color: string }>;

export const statusOptions: { name: TaskState; label: string }[] = [
	{
		name: 'failed',
		label: taskStateData.failed.label
	},
	{
		name: 'timed-out',
		label: taskStateData['timed-out'].label
	},
	{
		name: 'queued',
		label: taskStateData.queued.label
	},
	{
		name: 'running',
		label: taskStateData.running.label
	},
	{
		name: 'cancelled',
		label: taskStateData['cancelled'].label
	},
	{
		name: 'completed',
		label: taskStateData['completed'].label
	}
];

export const headers: TableHeader[] = [
	{
		label: 'Task',
		sort: {
			property: 'name',
			defaultDirection: 'asc'
		},
		style: {
			minWidth: 250
		}
	},
	{
		label: 'Project',
		sort: {
			property: 'project_name',
			defaultDirection: 'asc'
		},
		filter: {
			type: 'multiSelect',
			property: 'project_id',
			options: [],
			value: []
		},
		style: {
			minWidth: 250
		}
	},
	{
		label: 'Status',
		sort: {
			property: 'state',
			defaultDirection: 'asc'
		},
		filter: {
			type: 'multiSelect',
			property: 'state',
			options: statusOptions,
			value: statusOptions
		},
		style: {
			width: 180
		}
	},
	{
		label: 'Created',
		sort: {
			property: 'created_at',
			defaultDirection: 'asc'
		},
		style: {
			width: 150
		}
	},
	{
		label: '',
		style: {
			width: 40
		}
	}
];
