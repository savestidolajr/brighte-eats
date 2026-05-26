import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import { GraphQLError } from "graphql";
import { RegistrationForm } from "../components/RegistrationForm";
import { REGISTER, SERVICES } from "../graphql";

const servicesMock = {
  request: { query: SERVICES },
  result: { data: { services: [{ id: "1", code: "delivery", label: "Delivery" }] } },
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), "Ada");
  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/mobile/i), "0412345678");
  await user.type(screen.getByLabelText(/postcode/i), "2000");
  await user.type(screen.getByLabelText(/suburb/i), "Sydney");
  await user.click(await screen.findByLabelText(/delivery/i));
}

describe("RegistrationForm", () => {
  it("shows an error banner when the API returns a failure", async () => {
    const user = userEvent.setup();
    const errorMock = {
      request: {
        query: REGISTER,
        variables: {
          input: {
            name: "Ada", email: "ada@example.com", mobile: "0412345678",
            postcode: "2000", suburb: "Sydney", services: ["delivery"],
          },
        },
      },
      result: { errors: [new GraphQLError("A lead with this email already exists")] },
    };
    render(
      <MockedProvider mocks={[servicesMock, errorMock]} addTypename={false}>
        <RegistrationForm />
      </MockedProvider>
    );
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("shows a success message on the happy path", async () => {
    const user = userEvent.setup();
    const successMock = {
      request: {
        query: REGISTER,
        variables: {
          input: {
            name: "Ada", email: "ada@example.com", mobile: "0412345678",
            postcode: "2000", suburb: "Sydney", services: ["delivery"],
          },
        },
      },
      result: {
        data: {
          register: {
            id: "lead-1", name: "Ada", email: "ada@example.com",
            services: [{ code: "delivery", label: "Delivery" }],
          },
        },
      },
    };
    render(
      <MockedProvider mocks={[servicesMock, successMock]} addTypename={false}>
        <RegistrationForm />
      </MockedProvider>
    );
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/registered/i);
  });

  it("blocks submit and shows validation when input is invalid", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[servicesMock]} addTypename={false}>
        <RegistrationForm />
      </MockedProvider>
    );
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });
});
