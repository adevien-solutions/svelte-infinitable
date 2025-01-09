export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string | number | symbol, any>;
