import { UserRole }             from '@prisma/client';
import { profileRepository }    from '@/lib/database/profile';
import { taskRepository }       from '@/lib/database/task';

// ── Profile ───────────────────────────────────────
export function canManageProfiles(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canFetchAllProfiles(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canCreateProfiles(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canDeleteProfiles(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canUpdateProfiles(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

// ADMINs can access Organizations they are connected to.
export async function validateAdminOrganizationAccess(
    role            : UserRole | string,
    profileId       : number,
    organizationId  : number
): Promise<boolean> 
{
    if (role === 'SUPER_ADMIN') return true;
    
    if (role === 'ADMIN') 
    {
        return await profileRepository.existsWithOrganizationId(profileId, organizationId);
    }
    
    return false;
}

// ADMINs & USERs can access Organizations they are connected to.
export async function validateUserOrganizationAccess(
    role            : UserRole | string,
    profileId       : number,
    organizationId  : number
): Promise<boolean> 
{
    if (role === 'SUPER_ADMIN') return true;
    
    return await profileRepository.existsWithOrganizationId(profileId, organizationId);
}


// ── Tasks ───────────────────────────────────────
export function canFetchTasks(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canFetchAllTasks(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canUpdateTasks(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canCreateTasks(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canDeleteTasks(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function validateAdminTaskAccess(
    role            : UserRole | string,
    profileId       : number,
    taskId          : number
): Promise<boolean> 
{
    if (role === 'SUPER_ADMIN') return true;
    
    if (role === 'ADMIN') 
    {
        return await taskRepository.validateAdminTaskAccess(taskId, profileId);
    }
    
    return false;
}

// ── Organizations ───────────────────────────────────────
export function canFetchOrganizations(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canCreateOrganizations(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canUpdateOrganizations(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

export function canDeleteOrganizations(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

// ── Organization Settings ───────────────────────────────────────
export function canUpdateOrganizationSettings(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN';
}

// ── Artifacts ───────────────────────────────────────
export function canFetchArtifacts(role: UserRole | string): boolean 
{
    return true;
}

export function canUpdateArtifacts(role: UserRole | string): boolean 
{
    return true;
}

export function canCreateArtifacts(role: UserRole | string): boolean 
{
    return true;
}

export function canDeleteArtifacts(role: UserRole | string): boolean 
{
    return true;
}

// ── Artifact File Handling ───────────────────────────────────────
export function canUploadToArtifacts(role: UserRole | string): boolean 
{
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canAssignArtifacts(role: UserRole | string): boolean 
{
    return true;
}

export function canDeleteFiles(role: UserRole | string): boolean 
{
    return true;
}

