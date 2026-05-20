import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { AdminGate } from "../components/AdminGate";

describe("AdminGate", () => {
  beforeEach(() => localStorage.clear());

  it("shows the token form when no token is stored", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <AdminGate>
          <div>secret dashboard</div>
        </AdminGate>
      </MockedProvider>
    );
    expect(screen.getByLabelText(/admin token/i)).toBeInTheDocument();
    expect(screen.queryByText(/secret dashboard/i)).not.toBeInTheDocument();
  });

  it("renders children when a token is stored", () => {
    localStorage.setItem("adminToken", "x");
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <AdminGate>
          <div>secret dashboard</div>
        </AdminGate>
      </MockedProvider>
    );
    expect(screen.getByText(/secret dashboard/i)).toBeInTheDocument();
  });
});
