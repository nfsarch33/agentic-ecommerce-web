import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageUploadPreview } from "./ImageUploadPreview";

const objectUrls: string[] = [];

beforeEach(() => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => {
      const url = `blob:http://localhost/${objectUrls.length + 1}`;
      objectUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  objectUrls.length = 0;
  vi.clearAllMocks();
});

describe("ImageUploadPreview", () => {
  it("previews a selected image and shows the optimization plan without uploading", async () => {
    const user = userEvent.setup();
    const file = new File(["image"], "hero.png", { type: "image/png" });

    render(<ImageUploadPreview />);

    await user.upload(screen.getByLabelText(/product image/i), file);

    expect(screen.getByRole("img", { name: /preview of hero.png/i })).toHaveAttribute(
      "src",
      "blob:http://localhost/1",
    );
    expect(screen.getByText("hero.png")).toBeInTheDocument();
    expect(screen.getByText(/webp/i)).toBeInTheDocument();
    expect(screen.getByText(/no image has been uploaded/i)).toBeInTheDocument();
  });

  it("validates alt text before the product can pass media compliance", async () => {
    const user = userEvent.setup();
    const file = new File(["image"], "hero.png", { type: "image/png" });

    render(<ImageUploadPreview />);

    await user.upload(screen.getByLabelText(/product image/i), file);
    expect(screen.getByRole("alert")).toHaveTextContent(/add descriptive alt text/i);

    await user.type(screen.getByLabelText(/alt text/i), "Resistance band set with five tension levels");

    expect(screen.getByRole("status")).toHaveTextContent(/alt text looks usable/i);
  });
});
