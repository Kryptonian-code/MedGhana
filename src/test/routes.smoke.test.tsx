import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useAuthStore } from "@/stores/authStore";
import { protectedAppRoutes } from "@/config/sidebarConfig";
import type { AuthUser } from "@/types";

const superAdminUser: AuthUser = {
  id: "1",
  email: "admin@medghana.com",
  full_name: "Admin User",
  role: "super_admin",
  hospital_id: "1",
  branch_id: "1",
  hospital_name: "MedGhana General Hospital",
  hospital_code: "medghana-general",
  branch_name: "Main Branch",
  branch_code: "main",
};

const nurseUser: AuthUser = {
  ...superAdminUser,
  role: "nurse",
  email: "nurse@medghana.com",
  full_name: "Nurse Akosua",
};

function mockFetchForUser(user: AuthUser | null) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/auth/me.php")) {
      if (user) {
        return new Response(JSON.stringify({ user }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ message: "No active session." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/patients/index.php")) {
      return new Response(JSON.stringify({ patients: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/patients/show.php")) {
      return new Response(
        JSON.stringify({
          patient: {
            id: "1",
            hospital_number: "HSP-00001",
            first_name: "Test",
            last_name: "Patient",
            gender: "male",
            date_of_birth: "1990-01-01",
            phone: "0200000000",
            created_at: "2026-01-01 00:00:00",
            updated_at: "2026-01-01 00:00:00",
          },
          appointments: [],
          visits: [],
          invoices: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/appointments/index.php")) {
      return new Response(JSON.stringify({ appointments: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/triage/index.php")) {
      return new Response(JSON.stringify({ visits: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/consultations/index.php")) {
      return new Response(JSON.stringify({ pending_visits: [], consultations: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/pharmacy/index.php")) {
      return new Response(JSON.stringify({ drugs: [], prescriptions: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/laboratory/index.php")) {
      return new Response(JSON.stringify({ lab_orders: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/staff/index.php")) {
      return new Response(JSON.stringify({ staff: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/settings/index.php")) {
      return new Response(
        JSON.stringify({
          settings: {
            hospital_name: "MedGhana General Hospital",
            license_number: "GHS-HF-2024-001",
            phone: "0302771234",
            email: "info@medghana.com",
            address: "12 Independence Avenue",
            auto_generate_hospital_numbers: true,
            nhis_integration_enabled: true,
            sms_notifications_enabled: false,
            receipt_auto_print_enabled: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/profile/index.php")) {
      return new Response(
        JSON.stringify({
          profile: {
            id: user?.id || "1",
            username: user?.username || null,
            email: user?.email || "admin@medghana.com",
            full_name: user?.full_name || "Admin User",
            phone: user?.phone || "0240000000",
            role: user?.role || "super_admin",
            hospital_id: user?.hospital_id || "1",
            branch_id: user?.branch_id || "1",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/billing/index.php")) {
      return new Response(JSON.stringify({ invoices: [], billable_consultations: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/admissions/index.php")) {
      return new Response(JSON.stringify({ wards: [], admissions: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/insurance/index.php")) {
      return new Response(JSON.stringify({ claims: [], claimable_invoices: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/dashboard/index.php")) {
      return new Response(
        JSON.stringify({
          stats: {
            patients_today: 0,
            appointments_today: 0,
            waiting_triage: 0,
            ready_for_consultation: 0,
            pending_bills: 0,
            revenue_today: 0,
          },
          notifications: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/notifications/index.php")) {
      return new Response(JSON.stringify({ notifications: [], unread_count: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/owner/dashboard.php")) {
      return new Response(
        JSON.stringify({
          stats: {
            hospitals: 1,
            branches: 1,
            users: 1,
            patients: 0,
            queued_sms: 0,
            unread_notifications: 0,
            audit_events: 0,
          },
          hospitals: [],
          recent_sms: [],
          recent_audits: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/notifications/read.php")) {
      return new Response(JSON.stringify({ message: "Updated." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/auth/logout.php")) {
      return new Response(JSON.stringify({ message: "Logged out." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("route smoke tests", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("renders the public landing page", async () => {
    mockFetchForUser(null);
    window.history.replaceState({}, "", "/");

    render(<App />);

    expect(await screen.findByText("Simple hospital management")).toBeInTheDocument();
    expect((await screen.findAllByText("Create Hospital")).length).toBeGreaterThan(0);
  });

  it("renders the login page", async () => {
    mockFetchForUser(null);
    window.history.replaceState({}, "", "/login");

    render(<App />);

    expect(await screen.findByText("Sign in to your hospital workspace")).toBeInTheDocument();
  });

  it("renders the owner login page", async () => {
    mockFetchForUser(null);
    window.history.replaceState({}, "", "/owner/login");

    render(<App />);

    expect(await screen.findByText("Owner access to the MedGhana network")).toBeInTheDocument();
  });

  it("renders the create hospital page", async () => {
    mockFetchForUser(null);
    window.history.replaceState({}, "", "/create-hospital");

    render(<App />);

    expect(await screen.findByText("Launch your hospital workspace in one guided step")).toBeInTheDocument();
  });

  it.each(
    protectedAppRoutes.map((route) => [route.path, route.title])
  )("renders %s for an authorized user", async (path, title) => {
    mockFetchForUser(superAdminUser);
    window.history.replaceState({}, "", path);

    render(<App />);

    expect((await screen.findAllByText(title)).length).toBeGreaterThan(0);
  });

  it("renders the patient detail page for an authorized user", async () => {
    mockFetchForUser(superAdminUser);
    window.history.replaceState({}, "", "/patients/1");

    render(<App />);

    expect(await screen.findByText("Test Patient")).toBeInTheDocument();
  });

  it("redirects unauthorized users to access denied", async () => {
    mockFetchForUser(nurseUser);
    window.history.replaceState({}, "", "/billing");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });
  });
});
