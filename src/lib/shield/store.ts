import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Analysis, LinkFlag, Verdict } from "./engine";

export type Plan = "free" | "plus" | "rodina";

export type CheckRecord = {
  id: string;
  at: number;
  verdict: Verdict;
  score: number;
  type: string;
  reasons: string[];
  steps: string[];
  compromised: string[];
  source: Analysis["source"];
  linkHosts: string[];
  linkFlags: LinkFlag[];
  pendingAi?: boolean;
  text?: string;
};

export type FamilyAlert = {
  id: string;
  at: number;
  checkId: string;
  verdict: Verdict;
  type: string;
  read: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: "strazca" | "chraneny";
};

export type FamilyState = {
  name: string;
  code: string;
  guardianName: string;
  guardianPhone: string;
  protectedName: string;
  viewAs: "strazca" | "chraneny";
  shareText: boolean;
  members: FamilyMember[];
  alerts: FamilyAlert[];
};

export type WrongReport = {
  id: string;
  at: number;
  checkId: string;
  note: string;
};

type Settings = {
  senior: boolean;
  plan: Plan;
  storeText: boolean;
  monthKey: string;
  used: number;
  displayName: string;
  notify: boolean;
};

type ShieldState = {
  settings: Settings;
  checks: CheckRecord[];
  family: FamilyState | null;
  reports: WrongReport[];
  setSenior: (senior: boolean) => void;
  setPlan: (plan: Plan) => void;
  setStoreText: (storeText: boolean) => void;
  setDisplayName: (displayName: string) => void;
  setNotify: (notify: boolean) => void;
  addCheck: (record: CheckRecord) => void;
  deleteCheck: (id: string) => void;
  updateCheck: (id: string, patch: Partial<CheckRecord>) => void;
  addReport: (report: WrongReport) => void;
  createFamily: (input: {
    name: string;
    guardianName: string;
    guardianPhone: string;
  }) => void;
  joinFamily: (code: string, protectedName: string) => boolean;
  setView: (viewAs: FamilyState["viewAs"]) => void;
  setShareText: (shareText: boolean) => void;
  setGuardianPhone: (guardianPhone: string) => void;
  pushAlert: (alert: Omit<FamilyAlert, "id" | "at" | "read">) => void;
  markAlert: (id: string) => void;
  clearAll: () => void;
};

export const FREE_LIMIT = 5;

const emptySettings = (): Settings => ({
  senior: false,
  plan: "free",
  storeText: false,
  monthKey: monthKey(),
  used: 0,
  displayName: "",
  notify: false,
});

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

export function quota(settings: Settings): { used: number; limit: number; left: number } {
  const used = settings.monthKey === monthKey() ? settings.used : 0;
  const limit = settings.plan === "free" ? FREE_LIMIT : Number.POSITIVE_INFINITY;
  return {
    used,
    limit,
    left: limit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
  };
}

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export const useShield = create<ShieldState>()(
  persist(
    (set, get) => ({
      settings: emptySettings(),
      checks: [],
      family: null,
      reports: [],
      setSenior: (senior) => set((state) => ({ settings: { ...state.settings, senior } })),
      setPlan: (plan) => set((state) => ({ settings: { ...state.settings, plan } })),
      setStoreText: (storeText) =>
        set((state) => ({ settings: { ...state.settings, storeText } })),
      setDisplayName: (displayName) =>
        set((state) => ({ settings: { ...state.settings, displayName } })),
      setNotify: (notify) => set((state) => ({ settings: { ...state.settings, notify } })),
      addCheck: (record) =>
        set((state) => {
          const key = monthKey();
          const used = state.settings.monthKey === key ? state.settings.used : 0;
          return {
            checks: [record, ...state.checks].slice(0, 80),
            settings: { ...state.settings, monthKey: key, used: used + 1 },
          };
        }),
      deleteCheck: (id) =>
        set((state) => ({ checks: state.checks.filter((item) => item.id !== id) })),
      updateCheck: (id, patch) =>
        set((state) => ({
          checks: state.checks.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      addReport: (report) =>
        set((state) => ({ reports: [report, ...state.reports].slice(0, 40) })),
      createFamily: ({ name, guardianName, guardianPhone }) =>
        set(() => ({
          family: {
            name: name.trim() || "Naša rodina",
            code: code(),
            guardianName: guardianName.trim() || "Strážca",
            guardianPhone: guardianPhone.trim(),
            protectedName: "",
            viewAs: "strazca",
            shareText: false,
            members: [
              {
                id: crypto.randomUUID(),
                name: guardianName.trim() || "Strážca",
                role: "strazca",
              },
            ],
            alerts: [],
          },
        })),
      joinFamily: (invite, protectedName) => {
        const family = get().family;
        if (!family || family.code.toLowerCase() !== invite.trim().toLowerCase()) return false;
        const name = protectedName.trim() || "Mama";
        set({
          family: {
            ...family,
            protectedName: name,
            viewAs: "chraneny",
            members: family.members.some((member) => member.role === "chraneny")
              ? family.members.map((member) =>
                  member.role === "chraneny" ? { ...member, name } : member,
                )
              : [...family.members, { id: crypto.randomUUID(), name, role: "chraneny" }],
          },
          settings: { ...get().settings, senior: true },
        });
        return true;
      },
      setView: (viewAs) =>
        set((state) => (state.family ? { family: { ...state.family, viewAs } } : state)),
      setShareText: (shareText) =>
        set((state) => (state.family ? { family: { ...state.family, shareText } } : state)),
      setGuardianPhone: (guardianPhone) =>
        set((state) =>
          state.family ? { family: { ...state.family, guardianPhone } } : state,
        ),
      pushAlert: (alert) =>
        set((state) => {
          if (!state.family) return state;
          if (state.family.alerts.some((item) => item.checkId === alert.checkId)) return state;
          const next: FamilyAlert = {
            ...alert,
            id: crypto.randomUUID(),
            at: Date.now(),
            read: false,
          };
          return { family: { ...state.family, alerts: [next, ...state.family.alerts].slice(0, 40) } };
        }),
      markAlert: (id) =>
        set((state) =>
          state.family
            ? {
                family: {
                  ...state.family,
                  alerts: state.family.alerts.map((item) =>
                    item.id === id ? { ...item, read: true } : item,
                  ),
                },
              }
            : state,
        ),
      clearAll: () =>
        set({
          settings: emptySettings(),
          checks: [],
          family: null,
          reports: [],
        }),
    }),
    {
      name: "stit-v1",
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem: (key) => (typeof window === "undefined" ? null : localStorage.getItem(key)),
        setItem: (key, value) => {
          if (typeof window !== "undefined") localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") localStorage.removeItem(key);
        },
      })),
    },
  ),
);
