export type TaskState = 'timed-out' | 'failed' | 'completed' | 'queued' | 'running' | 'cancelled';

// 'not-started'
// 'validation_pending'
// 'validation_in_progress'
// 'export_pending'
// 'export_in_progress'
// 'upload_pending'
// 'upload_in_progress'
// 'cancelling'

export type TaskClientAction = 'validation' | 'export' | 'upload';

export type ProjectData = {
	id: string;
	name: string;
};

export type TaskData = {
	id: string;
	name: string;
	project_id: string;
	project_name: string;
	created_at: string;
	state: TaskState;
};
