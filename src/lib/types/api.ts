// /lib/types/api.ts

export interface ApiResponse<T = any> 
{
    success     : boolean;
    message?    : string;
    error?      : string;
    data?       : T;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, any>;
}