import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RateLimitNotice from "@/components/auth/RateLimitNotice";

describe("RateLimitNotice", () => {
  it("pokazuje domyślne odliczanie, gdy brak wartości", () => {
    render(<RateLimitNotice />);

    expect(screen.getByText(/Odczekaj kilka sekund/i)).toBeInTheDocument();
  });

  it("pokazuje odliczanie w sekundach, gdy przekazano wartość", () => {
    render(<RateLimitNotice remainingSeconds={12} />);

    expect(screen.getByText(/Odczekaj 12s/i)).toBeInTheDocument();
  });
});
