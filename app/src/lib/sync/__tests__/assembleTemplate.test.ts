import { test, expect } from "vitest";
import { assembleTemplate } from "@/lib/sync/assembleTemplate";

// Mock del cliente Supabase: query builder encadenable y "thenable" (como el real).
function mockClient() {
  const ft = { id: "t1", key: "P_X", name: "X", test_type: "precomisionamiento", revision: "Rev0" };
  const sections = [{ section_id: "s1", section_code: "S1", section_name: "Sec", sort_order: 10, is_active: true }];
  const sectionMeta = [{ id: "s1", is_universal: false }];
  const fields = [{ id: "f1", section_id: "s1", key: "it1", label: "Item", type: "checkbox", required: false, options: ["OK"], validations: null, hint: null, is_active: true, sort_order: 10 }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function qb(single: any, list: any) {
    const p = {
      select() { return p; },
      eq() { return p; },
      is() { return p; },
      in() { return p; },
      order() { return p; },
      single() { return Promise.resolve({ data: single, error: null }); },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(res: (v: { data: any; error: null }) => unknown) {
        return Promise.resolve({ data: list, error: null }).then(res);
      },
    };
    return p;
  }

  return {
    from(table: string) {
      if (table === "form_templates")    return qb(ft, null);
      if (table === "template_sections") return qb(null, sectionMeta);
      if (table === "section_fields")    return qb(null, fields);
      return qb(null, []);
    },
    rpc() { return Promise.resolve({ data: sections, error: null }); },
  };
}

test("assembleTemplate ensambla plantilla con revision y campos", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tpl = await assembleTemplate(mockClient() as any, "t1");
  expect(tpl).not.toBeNull();
  expect(tpl!.code).toBe("P_X");
  expect(tpl!.revision).toBe("Rev0");
  expect(tpl!.sections[0].fields[0].key).toBe("it1");
});
