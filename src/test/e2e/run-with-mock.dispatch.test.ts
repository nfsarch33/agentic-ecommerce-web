import { describe, expect, it } from "vitest";

import { handleMembershipRequest } from "../../../e2e/run-with-mock";

describe("handleMembershipRequest", () => {
  it("creates, pauses, and resumes memberships without changing the route contract", async () => {
    const createRequest = new Request("http://127.0.0.1/api/v1/memberships", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "tenant_tdd_membership",
      },
      body: JSON.stringify({
        member_email: "tdd-membership@example.com",
        plan_id: "plan_pro_monthly",
      }),
    });
    const createResponse = await handleMembershipRequest(createRequest, new URL(createRequest.url));

    expect(createResponse?.status).toBe(201);
    if (!createResponse) {
      throw new Error("expected createResponse");
    }
    const createdMembership = (await createResponse.json()) as {
      id: string;
      tenant_id: string;
      state: string;
      plan_id: string;
    };
    expect(createdMembership.tenant_id).toBe("tenant_tdd_membership");
    expect(createdMembership.state).toBe("active");
    expect(createdMembership.plan_id).toBe("plan_pro_monthly");

    const pauseRequest = new Request(`http://127.0.0.1/api/v1/memberships/${createdMembership.id}/pause`, {
      method: "POST",
    });
    const pauseResponse = await handleMembershipRequest(pauseRequest, new URL(pauseRequest.url));

    expect(pauseResponse?.status).toBe(200);
    if (!pauseResponse) {
      throw new Error("expected pauseResponse");
    }
    const pausedMembership = (await pauseResponse.json()) as { state: string };
    expect(pausedMembership.state).toBe("paused");

    const resumeRequest = new Request(`http://127.0.0.1/api/v1/memberships/${createdMembership.id}/resume`, {
      method: "POST",
    });
    const resumeResponse = await handleMembershipRequest(resumeRequest, new URL(resumeRequest.url));

    expect(resumeResponse?.status).toBe(200);
    if (!resumeResponse) {
      throw new Error("expected resumeResponse");
    }
    const resumedMembership = (await resumeResponse.json()) as { state: string };
    expect(resumedMembership.state).toBe("active");
  });
});
