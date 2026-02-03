export type Response<T> = {
    data: T | undefined;
    status: number;
};