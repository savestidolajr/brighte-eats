import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { ServiceManager } from "../components/ServiceManager";
import { ALL_SERVICES } from "../graphql";

const mock = {
  request: { query: ALL_SERVICES },
  result: {
    data: {
      allServices: [
        { id: "1", code: "delivery", label: "Delivery", active: true },
        { id: "2", code: "payment", label: "Payment", active: false },
      ],
    },
  },
};

describe("ServiceManager", () => {
  it("lists all services with their status and an add form", async () => {
    render(
      <MockedProvider mocks={[mock]} addTypename={false}>
        <ServiceManager />
      </MockedProvider>
    );
    // add form
    expect(screen.getByRole("button", { name: /add service/i })).toBeInTheDocument();
    // rows render (label inputs by aria-label) once the query resolves
    expect(await screen.findByLabelText(/label for delivery/i)).toHaveValue("Delivery");
    expect(await screen.findByLabelText(/label for payment/i)).toHaveValue("Payment");
    // retired service shows a Restore action
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
  });
});
