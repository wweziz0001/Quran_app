/**
 * Database Permissions System
 * نظام صلاحيات قاعدة البيانات
 */

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface DatabasePermission {
  // Reading permissions
  canViewTables: boolean;
  canViewData: boolean;
  canExecuteSelect: boolean;
  
  // Writing permissions
  canInsertData: boolean;
  canUpdateData: boolean;
  canDeleteData: boolean;
  
  // Structure permissions
  canCreateTable: boolean;
  canAlterTable: boolean;
  canDropTable: boolean;
  canCreateIndex: boolean;
  canDropIndex: boolean;
  
  // Admin permissions
  canBackup: boolean;
  canRestore: boolean;
  canImportExport: boolean;
  canViewAuditLogs: boolean;
}

// Permission sets for each role
export const ROLE_PERMISSIONS: Record<UserRole, DatabasePermission> = {
  viewer: {
    canViewTables: true,
    canViewData: true,
    canExecuteSelect: true,
    canInsertData: false,
    canUpdateData: false,
    canDeleteData: false,
    canCreateTable: false,
    canAlterTable: false,
    canDropTable: false,
    canCreateIndex: false,
    canDropIndex: false,
    canBackup: false,
    canRestore: false,
    canImportExport: false,
    canViewAuditLogs: false,
  },
  editor: {
    canViewTables: true,
    canViewData: true,
    canExecuteSelect: true,
    canInsertData: true,
    canUpdateData: true,
    canDeleteData: true,
    canImportExport: true,
    canCreateTable: false,
    canAlterTable: false,
    canDropTable: false,
    canCreateIndex: false,
    canDropIndex: false,
    canBackup: false,
    canRestore: false,
    canViewAuditLogs: true,
  },
  admin: {
    canViewTables: true,
    canViewData: true,
    canExecuteSelect: true,
    canInsertData: true,
    canUpdateData: true,
    canDeleteData: true,
    canCreateTable: true,
    canAlterTable: true,
    canDropTable: true,
    canCreateIndex: true,
    canDropIndex: true,
    canBackup: true,
    canRestore: true,
    canImportExport: true,
    canViewAuditLogs: true,
  },
};

// Query type to permission mapping
export const QUERY_PERMISSION_MAP: Record<string, keyof DatabasePermission> = {
  'SELECT': 'canExecuteSelect',
  'INSERT': 'canInsertData',
  'UPDATE': 'canUpdateData',
  'DELETE': 'canDeleteData',
  'CREATE_TABLE': 'canCreateTable',
  'ALTER_TABLE': 'canAlterTable',
  'DROP_TABLE': 'canDropTable',
  'CREATE_INDEX': 'canCreateIndex',
  'DROP_INDEX': 'canDropIndex',
};

/**
 * Check if a user has permission for a specific action
 */
export function hasPermission(
  userRole: UserRole,
  permission: keyof DatabasePermission
): boolean {
  return ROLE_PERMISSIONS[userRole][permission] === true;
}

/**
 * Check if a user can execute a specific query type
 */
export function canExecuteQuery(
  userRole: UserRole,
  queryType: string
): { allowed: boolean; reason?: string } {
  const permission = QUERY_PERMISSION_MAP[queryType.toUpperCase()];
  
  if (!permission) {
    // Unknown query type - allow for admins only
    if (userRole === 'admin') {
      return { allowed: true };
    }
    return { allowed: false, reason: `Unknown query type: ${queryType}` };
  }
  
  if (hasPermission(userRole, permission)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `You don't have permission to execute ${queryType} queries`,
  };
}

/**
 * Get all permissions for a user role
 */
export function getPermissions(userRole: UserRole): DatabasePermission {
  return ROLE_PERMISSIONS[userRole];
}

/**
 * Get role display name in Arabic
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    viewer: 'مشاهد',
    editor: 'محرر',
    admin: 'مدير',
  };
  return names[role];
}

/**
 * Get permission display name in Arabic
 */
export function getPermissionDisplayName(permission: keyof DatabasePermission): string {
  const names: Record<keyof DatabasePermission, string> = {
    canViewTables: 'عرض الجداول',
    canViewData: 'عرض البيانات',
    canExecuteSelect: 'تنفيذ استعلامات SELECT',
    canInsertData: 'إضافة بيانات',
    canUpdateData: 'تعديل البيانات',
    canDeleteData: 'حذف البيانات',
    canCreateTable: 'إنشاء جداول',
    canAlterTable: 'تعديل هيكل الجداول',
    canDropTable: 'حذف الجداول',
    canCreateIndex: 'إنشاء فهارس',
    canDropIndex: 'حذف الفهارس',
    canBackup: 'إنشاء نسخ احتياطية',
    canRestore: 'استعادة النسخ الاحتياطية',
    canImportExport: 'استيراد وتصدير البيانات',
    canViewAuditLogs: 'عرض سجلات التدقيق',
  };
  return names[permission];
}

/**
 * Permission categories
 */
export const PERMISSION_CATEGORIES = {
  reading: [
    'canViewTables',
    'canViewData',
    'canExecuteSelect',
  ] as const,
  writing: [
    'canInsertData',
    'canUpdateData',
    'canDeleteData',
  ] as const,
  structure: [
    'canCreateTable',
    'canAlterTable',
    'canDropTable',
    'canCreateIndex',
    'canDropIndex',
  ] as const,
  admin: [
    'canBackup',
    'canRestore',
    'canImportExport',
    'canViewAuditLogs',
  ] as const,
};

/**
 * Category display names in Arabic
 */
export const CATEGORY_NAMES = {
  reading: 'القراءة',
  writing: 'الكتابة',
  structure: 'الهيكل',
  admin: 'الإدارة',
};
