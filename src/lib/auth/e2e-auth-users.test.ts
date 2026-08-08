import { describe, expect, it, vi } from "vitest";

import { ensureE2eAuthUser } from "../../../tests/e2e/support/auth-users";

const id = "12000000-0000-4000-8000-000000000001";
const email = "e2e-owner@sightline.local";
const password = "Sightline-E2E-2026!";

describe("E2E Auth user provisioning", () => {
  const passwordAuth = () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  });

  it("returns a newly created password identity", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id } },
      error: null,
    });
    const admin = {
      auth: { admin: { createUser } },
    };

    await expect(
      ensureE2eAuthUser({
        admin: admin as never,
        auth: passwordAuth() as never,
        id,
        email,
        password,
      }),
    ).resolves.toBe(id);
    expect(createUser).toHaveBeenCalledWith({
      id,
      email,
      password,
      email_confirm: true,
    });
  });

  it("updates an existing identity without deleting referenced Auth data", async () => {
    const createUser = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: null }, error: { status: 422 } });
    const updateUserById = vi.fn().mockResolvedValue({
      data: { user: { id } },
      error: null,
    });
    const admin = {
      auth: {
        admin: {
          createUser,
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id, email } },
            error: null,
          }),
          updateUserById,
        },
      },
    };

    await expect(
      ensureE2eAuthUser({
        admin: admin as never,
        auth: passwordAuth() as never,
        id,
        email,
        password,
      }),
    ).resolves.toBe(id);
    expect(updateUserById).toHaveBeenCalledWith(id, {
      email,
      password,
      email_confirm: true,
    });
    expect(createUser).toHaveBeenCalledTimes(1);
  });
});
