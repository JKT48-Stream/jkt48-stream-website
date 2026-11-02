import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import {
  fetchJKT48ConnectLive,
  indexJKT48ConnectLive,
  buildMemberLiveStatus,
  resolveMemberLiveStatus,
  type JKT48ConnectLiveEntry,
} from "@/lib/jkt48connect";

const entries: JKT48ConnectLiveEntry[] = [
  { name: "Erine", img: "i", platform: "showroom", url_key: "JKT48_Erine", room_url_key: "JKT48_Erine", room_id: 510000,
    streaming: [{ label: "o", quality: 1000, url: "https://cdn.test/main.m3u8" }, { label: "l", quality: 100, url: "https://cdn.test/low.m3u8" }] },
  { name: "Aralie", img: "j", platform: "idn", url_key: "jkt48_aralie", slug: "live-1", link: "https://www.idn.app/jkt48_aralie/live/live-1", streaming: [] },
];

describe("client live", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("buildMemberLiveStatus: Showroom punya stream, IDN belum", () => {
    const idx = indexJKT48ConnectLive(entries);
    const sr = buildMemberLiveStatus(idx, { showroomKey: "jkt48_erine", showroomRoomId: 510000 });
    expect(sr.showroom).toBe("live");
    expect(sr.showroomStreamUrl).toContain("/functions/v1/hls-proxy?u=");
    expect(sr.showroomStreamUrlLow).toBeTruthy();
    expect(sr.showroomStreamUrlLow).not.toBe(sr.showroomStreamUrl);
    const idn = buildMemberLiveStatus(idx, { idnUsername: "jkt48_aralie" });
    expect(idn.idn).toBe("live");
    expect(idn.idnStreamUrl).toBeNull();
    expect(idn.idnUrl).toBe("https://www.idn.app/jkt48_aralie/live/live-1");
  });

  it("resolveMemberLiveStatus: IDN diambil lewat action=watch", async () => {
    invoke.mockResolvedValue({ data: { available: true, stream_url: "https://ivs.test/a.m3u8", streaming: [{ label: "original", quality: 1, url: "https://ivs.test/a.m3u8" }] }, error: null });
    const st = await resolveMemberLiveStatus(indexJKT48ConnectLive(entries), { idnUsername: "jkt48_aralie" });
    expect(invoke.mock.calls[0][0]).toBe("live?action=watch&platform=idn&key=jkt48_aralie");
    expect(st.idnStreamUrl).toContain("hls-proxy");
  });

  it("resolveMemberLiveStatus: gagal watch tidak melempar", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: "x", code: "UPSTREAM_ERROR" }) } } });
    // key berbeda dari test sebelumnya (hasil watch di-memo 15 detik per key)
    const other: JKT48ConnectLiveEntry[] = [{ name: "Bella", img: "k", platform: "idn", url_key: "jkt48_bella", slug: "l2", streaming: [] }];
    const st = await resolveMemberLiveStatus(indexJKT48ConnectLive(other), { idnUsername: "jkt48_bella" });
    expect(st.idn).toBe("live");
    expect(st.idnStreamUrl).toBeNull();
  });

  it("fetchJKT48ConnectLive: memanggil function `live`, melempar EdgeError dengan code", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: "Kuota habis", code: "QUOTA_EXCEEDED" }) } } });
    await expect(fetchJKT48ConnectLive()).rejects.toMatchObject({ code: "QUOTA_EXCEEDED", message: "Kuota habis" });
    expect(invoke.mock.calls[0][0]).toBe("live");
  });
});

import { fetchTheaterPage, fetchTheaterRemaining, theaterPageCount, mergeTheaterShows } from "@/lib/theater";

describe("client theater (per halaman)", () => {
  const item = (c: string) => ({ reference_code: c, title: c } as any);
  beforeEach(() => {
    invoke.mockReset();
  });

  it("theaterPageCount dibatasi max_pages & 1 bila semua muat di halaman 1", () => {
    expect(theaterPageCount({ items: [item("a")], page: 1, perpage: 20, total: 1 })).toBe(1);
    expect(theaterPageCount({ items: new Array(20).fill(item("a")), page: 1, perpage: 20, total: 45 })).toBe(3);
    expect(theaterPageCount({ items: new Array(20).fill(item("a")), page: 1, perpage: 20, total: 999, max_pages: 5 })).toBe(5);
  });

  it("fetchTheaterRemaining: halaman 2..N paralel, halaman gagal dilewati", async () => {
    invoke.mockImplementation(async (name: string) => {
      if (name.includes("page=2")) return { data: { items: [item("p2")], page: 2, perpage: 20, total: 60 }, error: null };
      if (name.includes("page=3")) return { data: null, error: { context: { json: async () => ({ error: "lambat", code: "UPSTREAM_ERROR" }) } } };
      throw new Error("tak terduga " + name);
    });
    const first = { items: [item("p1")], page: 1, perpage: 20, total: 60 };
    const out = await fetchTheaterRemaining(first);
    expect(out.map((s) => s.reference_code)).toEqual(["p2"]);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("fetchTheaterPage memanggil action=list&page=N", async () => {
    invoke.mockResolvedValue({ data: { items: [item("x")], page: 1, perpage: 20, total: 1 }, error: null });
    const r = await fetchTheaterPage(1);
    expect(invoke.mock.calls[0][0]).toBe("theater?action=list&page=1");
    expect(r.items).toHaveLength(1);
  });

  it("mergeTheaterShows: yang belakangan menimpa", () => {
    const a = { reference_code: "a", title: "lama" } as any;
    const b = { reference_code: "a", title: "baru" } as any;
    expect(mergeTheaterShows([a], [b])[0].title).toBe("baru");
  });
});
