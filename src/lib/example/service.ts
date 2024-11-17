import { projects, tasks } from './data.js';
import type { ProjectData, TaskData } from './types.js';

export async function getTasks(
	page = 1,
	limit = 100,
	search = '',
	sort: keyof TaskData = 'created_at',
	order: 'asc' | 'desc' = 'desc'
): Promise<{ data: TaskData[]; depleted: boolean; total: number }> {
	return new Promise((resolve) => {
		setTimeout(() => {
			let filteredTasks = [...tasks];

			if (search) {
				search = search.trim().toLowerCase();
				filteredTasks = filteredTasks.filter((task) => {
					return task.name.trim().toLowerCase().includes(search);
				});
			}

			if (sort && order) {
				filteredTasks.sort((a, b) => {
					const aValue = a[sort];
					const bValue = b[sort];
					if (aValue < bValue) {
						return order === 'asc' ? -1 : 1;
					}
					if (aValue > bValue) {
						return order === 'asc' ? 1 : -1;
					}
					return 0;
				});
			}

			const data = filteredTasks.slice((page - 1) * limit, page * limit) as TaskData[];
			resolve({
				data,
				depleted: page * limit >= filteredTasks.length,
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
