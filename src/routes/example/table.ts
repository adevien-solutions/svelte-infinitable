import type { TableHeader } from '$lib/types/index.js';
import type { TaskData, TaskState } from './types.js';

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

export const tableHeaders: TableHeader<{ name: keyof TaskData }>[] = [
	{
		label: 'Task',
		meta: {
			name: 'name'
		},
		sort: {
			mode: 'server'
		},
		style: {
			minWidth: 250
		}
	},
	{
		label: 'Project',
		meta: {
			name: 'project_name'
		},
		sort: {
			mode: 'server'
		},
		filter: {
			type: 'text',
			mode: 'server',
			placeholder: 'Filter by project name or ID'
		},
		style: {
			minWidth: 250
		}
	},
	{
		label: 'Status',
		meta: {
			name: 'state'
		},
		sort: {
			mode: 'server'
		},
		filter: {
			type: 'multiSelect',
			mode: 'server',
			options: statusOptions,
			value: statusOptions
		},
		style: {
			width: 180
		}
	},
	{
		label: 'Created',
		meta: {
			name: 'created_at'
		},
		sort: {
			mode: 'server',
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
