import { describe, expect, it } from 'vitest';
import { LoginInputSchema, RoleSchema, SessionSchema, UserSchema } from './auth.js';

describe('RoleSchema', () => {
  it('accepts the four RetailOne roles', () => {
    for (const role of ['ADMIN', 'PURCHASING_OFFICER', 'STORE_EMPLOYEE', 'MANAGER']) {
      expect(RoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it('rejects the retired STAFF role', () => {
    expect(RoleSchema.safeParse('STAFF').success).toBe(false);
  });
});

describe('UserSchema', () => {
  it('accepts a store employee bound to one store', () => {
    const result = UserSchema.safeParse({
      id: 'u1',
      email: 'staff_b01@erp.local',
      name: 'Store Employee B01',
      role: 'STORE_EMPLOYEE',
      storeCode: 'B01',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a user with no store assignment', () => {
    const result = UserSchema.safeParse({
      id: 'u2',
      email: 'manager01@erp.local',
      name: 'Manager',
      role: 'MANAGER',
      storeCode: null,
    });

    expect(result.success).toBe(true);
  });
});

describe('LoginInputSchema', () => {
  it('accepts an email and password', () => {
    const result = LoginInputSchema.safeParse({ email: 'admin@erp.local', password: 'password' });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = LoginInputSchema.safeParse({ email: 'admin', password: 'password' });

    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = LoginInputSchema.safeParse({ email: 'admin@erp.local', password: '' });

    expect(result.success).toBe(false);
  });
});

describe('SessionSchema', () => {
  it('accepts a signed-out session', () => {
    expect(SessionSchema.safeParse({ user: null }).success).toBe(true);
  });

  it('rejects an unknown role', () => {
    const result = SessionSchema.safeParse({
      user: { id: '1', email: 'a@erp.local', name: 'A', role: 'OWNER', storeCode: null },
    });

    expect(result.success).toBe(false);
  });
});
