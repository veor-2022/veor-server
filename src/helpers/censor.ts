import { displayName } from './displayName';
import { exclude } from './exclude';

export const censor = (obj: any): any => displayName(exclude(obj, 'password'));
