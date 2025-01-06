import { render, screen, fireEvent} from "@testing-library/react";
import Header from "../src/components/header";
import { vi } from "vitest";
import { useRouter } from "next/navigation";

// Mock the Next.js useRouter hook
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("Header Component", () => {
  beforeEach(() => {

    vi.clearAllMocks();
  });

  it("renders login and sign up buttons when not authenticated", () => {
    render(<Header />);

    expect(screen.getByText("log in")).toBeInTheDocument();
    expect(screen.getByText("sign up")).toBeInTheDocument();
  });

  it("renders logout button when authenticated", () => {

    sessionStorage.setItem("authToken", "fake-token");

    render(<Header />);

    expect(screen.getByText("log out")).toBeInTheDocument();
  });

  it("logs out the user and redirects to the home page when logout button is clicked", () => {
    sessionStorage.setItem("authToken", "fake-token");

    const pushMock = vi.fn();
    (useRouter as vi.Mock).mockReturnValue({ push: pushMock });

    render(<Header />);

    fireEvent.click(screen.getByText("log out"));

    expect(sessionStorage.getItem("authToken")).toBeNull();

    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
