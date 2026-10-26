import { InjectionToken } from '@angular/core';

/**
 * Route prefix the VIP client screens are mounted under.
 *
 * vip.manage is grantable to a staff account, but the screens only existed
 * under `/admin/vip`, which is behind adminGuard — so the grant showed a
 * tick in the permission editor and gave the holder nothing they could
 * reach. Mirrors CAMERAS_BASE_PATH, which solved the same problem for the
 * stock inventory screens.
 */
export const VIP_BASE_PATH = new InjectionToken<string>('VIP_BASE_PATH', {
  factory: () => '/admin/vip',
});
