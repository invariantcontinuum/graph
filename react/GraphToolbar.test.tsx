/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraphToolbar } from "./GraphToolbar";
import type { GraphHandle } from "./index";

describe("GraphToolbar", () => {
  it("shows validation error when search yields no results", () => {
    const mockGraphHandle: GraphHandle = {
      fit: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      relayout: vi.fn(),
      setTheme: vi.fn(),
      setData: vi.fn(),
      selectNode: vi.fn(),
      panToNode: vi.fn(),
      focusFit: vi.fn(),
      subscribeFrame: vi.fn(),
      subscribeEdges: vi.fn(),
      search: vi.fn().mockReturnValue([]),
      getSnapshot: vi.fn().mockReturnValue({ nodes: [], edges: [], meta: { node_count: 0, edge_count: 0 } }),
    };
    const mockRef = { current: mockGraphHandle };

    render(<GraphToolbar graphRef={mockRef} />);
    const input = screen.getByPlaceholderText("Search nodes…");
    const button = screen.getByLabelText("Submit search");

    // Simulate user typing a query that yields no results
    fireEvent.change(input, { target: { value: "unknown" } });
    fireEvent.click(button);

    // The validation message is part of HTML5 constraint validation API
    expect((input as HTMLInputElement).validationMessage).toBe("No nodes found");
  });
});
