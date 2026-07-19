import {
  toReviewFromStored,
  toReviewModules,
  toSyncPayload,
} from "./review-state";
import type { StoredModule } from "@/lib/api/subjects";

const stored: StoredModule[] = [
  {
    id: "module-1",
    name: "Aritmética",
    order: 0,
    topics: [
      { id: "topic-1", title: "Números", description: "a", order: 0 },
      { id: "topic-2", title: "Divisibilidad", description: null, order: 1 },
    ],
  },
];

describe("toReviewFromStored", () => {
  it("keeps the persisted ids alongside the client keys", () => {
    const [module] = toReviewFromStored(stored);

    expect(module.id).toBe("module-1");
    expect(module.key).toEqual(expect.any(String));
    expect(module.topics.map((t) => t.id)).toEqual(["topic-1", "topic-2"]);
  });

  it("normalizes a null description to an empty string", () => {
    const [module] = toReviewFromStored(stored);

    expect(module.topics[1].description).toBe("");
  });
});

describe("toSyncPayload", () => {
  it("preserves ids so the backend updates instead of recreating", () => {
    const payload = toSyncPayload(toReviewFromStored(stored));

    expect(payload.modules[0].id).toBe("module-1");
    expect(payload.modules[0].topics[0].id).toBe("topic-1");
  });

  it("omits the id for records created in the review", () => {
    const modules = toReviewFromStored(stored);
    // Estrutura vinda do parse não tem id — é registro novo
    const parsed = toReviewModules([
      { name: "Nuevo módulo", topics: [{ title: "Nuevo tema", description: "" }] },
    ]);
    const payload = toSyncPayload([...modules, ...parsed]);

    expect(payload.modules[1]).not.toHaveProperty("id");
    expect(payload.modules[1].topics[0]).not.toHaveProperty("id");
  });

  it("never leaks the client-side key into the body", () => {
    const payload = toSyncPayload(toReviewFromStored(stored));

    expect(JSON.stringify(payload)).not.toContain("key");
  });

  it("trims titles and module names", () => {
    const payload = toSyncPayload([
      {
        key: "k1",
        name: "  Aritmética  ",
        topics: [{ key: "k2", title: "  Números  ", description: "sin trim" }],
      },
    ]);

    expect(payload.modules[0].name).toBe("Aritmética");
    expect(payload.modules[0].topics[0].title).toBe("Números");
    expect(payload.modules[0].topics[0].description).toBe("sin trim");
  });
});
