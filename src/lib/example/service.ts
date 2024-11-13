import { projects, tasks } from './data.js';
import type { ProjectData, TaskData } from './types.js';

export async function getTasks(
	page = 1,
	limit = 100
): Promise<{ data: TaskData[]; depleted: boolean; total: number }> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const data = tasks.slice((page - 1) * limit, page * limit) as TaskData[];
			resolve({
				data,
				depleted: page * limit >= tasks.length,
				total: tasks.length
			});
		}, 1000);
	});
}

export async function getProjects(): Promise<ProjectData[]> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(projects);
		}, 1000);
	});
}
