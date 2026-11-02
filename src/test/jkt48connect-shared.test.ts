import { describe, it, expect, vi } from "vitest";
import {
  TtlCache,
  UpstreamError,
  shapeLive,
  shapeWatch,
  shapeTheaterPage,
  shapeTheaterDetail,
  toWib,
  upstreamGet,
  validateApiKey,
} from "../../supabase/functions/_shared/jkt48connect";

const KEY = "jkc_" + "a1".repeat(20);

describe("validateApiKey", () => {
  it("menerima format baru", () => expect(validateApiKey(KEY).ok).toBe(true));
  it("menolak format lama dengan pesan jelas", () => {
    const r = validateApiKey("jk48c_abc");
    expect(r.ok).toBe(false);
    expect((r as any).message).toMatch(/LAMA/);
  });
  it("menolak kosong / salah format", () => {
    expect(validateApiKey("").ok).toBe(false);
    expect(validateApiKey("jkc_xyz").ok).toBe(false);
  });
});

describe("shapeLive", () => {
  const SR = "https://shard.showroom-txlive.com/live/abc";
  const raw = [
    {
      name: "Erine", type: "showroom", url_key: "JKT48_Erine", room_id: 510000,
      started_at: "2026-10-27T14:10:42.000Z", notification_data_id: "sr-510000-1",
      notification_caption: "🔴 Erine — Halo\nhttps://www.showroom-live.com/r/JKT48_Erine",
      streaming_url_list: [
        { label: "low", quality: 100, url: `${SR}_low.m3u8`, type: "hls" },
        { label: "orig", quality: 1000, url: `${SR}_main.m3u8`, type: "hls" },
        { label: "dup", quality: 1000, url: `${SR}_main.m3u8`, type: "hls" },
        { label: "rtc", quality: 3000, url: "https://x.test/rtc", type: "webrtc" },
        { label: "evil", quality: 2000, url: "javascript:alert(1)", type: "hls" },
        { label: "http", quality: 500, url: "http://cdn.test/a.m3u8", type: "hls" },
      ],
    },
    { name: "Aralie", type: "idn", url_key: "jkt48_aralie", slug: "live-aralie", notification_data_id: "idn-1" },
    { name: "Aralie (dup)", type: "idn", url_key: "jkt48_aralie", slug: "live-aralie", notification_data_id: "idn-1" },
  ];
  it("menormalkan, mengurutkan kualitas, membuang URL berbahaya & duplikat", () => {
    const out = shapeLive(raw);
    expect(out).toHaveLength(2);
    const sr = out.find((e) => e.platform === "showroom")!;
    expect(sr.streaming.map((s) => s.quality)).toEqual([1000, 100]);
    expect(sr.stream_url).toBe(`${SR}_main.m3u8`);
    expect(sr.link).toBe("https://www.showroom-live.com/r/JKT48_Erine");
    expect(sr.room_id).toBe(510000);
    expect(out.find((e) => e.platform === "idn")!.streaming).toEqual([]);
  });
  it("menerima bentuk { lives: [...] } dan input rusak", () => {
    expect(shapeLive({ lives: raw })).toHaveLength(2);
    expect(shapeLive(null)).toEqual([]);
    expect(shapeLive({})).toEqual([]);
  });
});

describe("shapeWatch", () => {
  it("IDN: stream_url / playback_url", () => {
    expect(shapeWatch({ stream_url: "https://ivs.test/a.m3u8" }).stream_url).toBe("https://ivs.test/a.m3u8");
    expect(shapeWatch({ playback_url: "https://ivs.test/b.m3u8" }).stream_url).toBe("https://ivs.test/b.m3u8");
  });
  it("Showroom: hanya hls", () => {
    const r = shapeWatch({ streaming_url_list: [
      { type: "lhls", quality: 9, url: "https://a.test/l.m3u8" },
      { type: "hls", quality: 1000, url: "https://a.test/h.m3u8" },
    ] });
    expect(r.streaming).toHaveLength(1);
    expect(r.stream_url).toBe("https://a.test/h.m3u8");
  });
  it("kosong bila tidak ada sumber", () => expect(shapeWatch({}).stream_url).toBe(""));
});

describe("toWib", () => {
  it("UTC (Z) → WIB", () => expect(toWib("2026-11-08T12:00:00.000Z")).toEqual({ date: "2026-11-08", time: "19:00" }));
  it("UTC melewati tengah malam → tanggal WIB berikutnya", () =>
    expect(toWib("2026-11-08T18:30:00Z")).toEqual({ date: "2026-11-09", time: "01:30" }));
  it("tanpa zona dianggap WIB", () => expect(toWib("2026-11-08T19:00:00")).toEqual({ date: "2026-11-08", time: "19:00" }));
  it("tanggal saja + jam terpisah", () => expect(toWib("2026-11-08", "19:00")).toEqual({ date: "2026-11-08", time: "19:00" }));
  it("tengah malam WIB = tanpa jam", () => expect(toWib("2026-11-07T17:00:00Z")).toEqual({ date: "2026-11-08", time: "" }));
  it("invalid → null", () => expect(toWib("bukan tanggal")).toBeNull());
});

describe("shapeTheater*", () => {
  const show = {
    code: "SH9A7D", title: "Pajama Drive", start_date: "2026-11-08T12:00:00.000Z", team: "Team Love",
    url: "https://jkt48.com/theater/SH9A7D",
    members: [{ url_key: "gracie", id: "5", name: "Gracie", img: "https://img.test/g.jpg" }],
    seitansai: [{ id: "7", name: "Fiony", img: "https://img.test/f.jpg" }],
    schedule_designs: { jkt48connect: { banner: { status: "ready", url: "https://api.jkt48connect.app/media/b.png" }, portrait: { status: "pending", url: "https://x/p.png" } } },
  };
  it("daftar: field dipetakan ke bentuk UI", () => {
    const page = shapeTheaterPage({ theater: [show, { title: "tanpa kode" }], page: 1, perpage: 40, total_count: 1 });
    expect(page.items).toHaveLength(1);
    const it0 = page.items[0];
    expect(it0).toMatchObject({
      reference_code: "SH9A7D", date: "2026-11-08", start_time: "19:00", jkt48_member_type: "LOVE",
      is_birthday_show: true, banner: "https://api.jkt48connect.app/media/b.png", poster: "",
    });
    expect(it0.lineup[0]).toMatchObject({ name: "Gracie", url_key: "gracie" });
    expect(it0.birthday_members[0].name).toBe("Fiony");
  });
  it("detail: setlist, graduation, rekaman", () => {
    const d = shapeTheaterDetail({ shows: [{ ...show, setlist: { songs: [{ title: "A" }, "B"] },
      graduation: [{ name: "X" }],
      recordings: [{ youtube_url: "https://youtu.be/abc", screenshots: [{ url: "https://s/1.jpg" }] }, { youtube_url: null }] }] }, "SH9A7D")!;
    expect(d.set_list).toEqual(["A", "B"]);
    expect(d.graduation_members).toHaveLength(1);
    expect(d.recordings).toEqual([{ title: "Pajama Drive", youtube_url: "https://youtu.be/abc", thumbnail: "https://s/1.jpg" }]);
  });
  it("detail kosong → null", () => expect(shapeTheaterDetail({ shows: [] }, "x")).toBeNull());
});

describe("upstreamGet", () => {
  const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });
  const noSleep = async () => {};

  it("mengirim X-API-Key & query, membaca kuota", async () => {
    const f = vi.fn().mockResolvedValue(res(200, { ok: 1 }, { "X-RateLimit-Limit": "1000", "X-RateLimit-Remaining": "999", "X-RateLimit-Reset": "1", "X-Quota-Period": "2026-11" }));
    const r = await upstreamGet("/api/now_live", { apiKey: KEY, query: { group: "jkt48" }, fetchImpl: f as any });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.jkt48connect.app/api/now_live?group=jkt48");
    expect(init.headers["X-API-Key"]).toBe(KEY);
    expect(r.quota?.remaining).toBe(999);
  });
  it("retry untuk 5xx lalu sukses", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(503, {})).mockResolvedValueOnce(res(200, [1]));
    const r = await upstreamGet("/x", { apiKey: KEY, fetchImpl: f as any, sleep: noSleep });
    expect(r.body).toEqual([1]);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("tidak retry 401; code CONFIG_ERROR", async () => {
    const f = vi.fn().mockResolvedValue(res(401, { message: "Key salah" }));
    await expect(upstreamGet("/x", { apiKey: KEY, fetchImpl: f as any, sleep: noSleep })).rejects.toMatchObject({ status: 401, code: "CONFIG_ERROR" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("429 kuota → QUOTA_EXCEEDED + resetAt", async () => {
    const f = vi.fn().mockResolvedValue(res(429, { message: "Kuota bulanan habis", limit: 1000, used: 1000, resets_at: "2026-10-31T17:00:00.000Z" }, { "Retry-After": "3600" }));
    const err: any = await upstreamGet("/x", { apiKey: KEY, fetchImpl: f as any }).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe("QUOTA_EXCEEDED");
    expect(err.extra.resetAt).toBe(Date.parse("2026-10-31T17:00:00.000Z"));
    expect(err.extra.retryAfterSec).toBe(3600);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("404 → NOT_FOUND", async () => {
    const f = vi.fn().mockResolvedValue(res(404, {}));
    await expect(upstreamGet("/x", { apiKey: KEY, fetchImpl: f as any })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("gagal jaringan terus → NETWORK setelah retry habis", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(upstreamGet("/x", { apiKey: KEY, fetchImpl: f as any, sleep: noSleep, retries: 1 })).rejects.toMatchObject({ code: "NETWORK" });
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("TtlCache", () => {
  it("menggabungkan request bersamaan & memakai cache", async () => {
    const c = new TtlCache();
    const loader = vi.fn().mockResolvedValue("v");
    const [a, b] = await Promise.all([c.getOrLoad("k", 1000, 0, loader), c.getOrLoad("k", 1000, 0, loader)]);
    await c.getOrLoad("k", 1000, 0, loader);
    expect(a.data).toBe("v"); expect(b.data).toBe("v");
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it("menyajikan data lama saat upstream gagal sementara, tapi tidak untuk 401", async () => {
    let t = 0;
    const c = new TtlCache(() => t);
    await c.getOrLoad("k", 10, 1000, async () => "lama");
    t = 100;
    const r = await c.getOrLoad("k", 10, 1000, async () => { throw new UpstreamError(502, "x", "UPSTREAM_ERROR"); });
    expect(r).toEqual({ data: "lama", stale: true });
    await expect(c.getOrLoad("k", 10, 1000, async () => { throw new UpstreamError(401, "x", "CONFIG_ERROR"); })).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("TtlCache SWR", () => {
  it("menyajikan data lama seketika & memperbarui di latar", async () => {
    let t = 0;
    const c = new TtlCache(() => t);
    await c.getOrLoad("k", 10, 1000, async () => "lama", { swr: true });
    t = 100;
    let release!: (v: string) => void;
    const slow = new Promise<string>((r) => (release = r));
    const loader = vi.fn(() => slow);
    const bg: Promise<unknown>[] = [];
    const r = await c.getOrLoad("k", 10, 1000, loader, { swr: true, waitUntil: (p) => bg.push(p) });
    expect(r).toEqual({ data: "lama", stale: true }); // tidak menunggu loader lambat
    expect(loader).toHaveBeenCalledTimes(1);
    await c.getOrLoad("k", 10, 1000, loader, { swr: true }); // refresh sedang berjalan → tidak dobel
    expect(loader).toHaveBeenCalledTimes(1);
    release("baru");
    await Promise.all(bg);
    expect(await c.getOrLoad("k", 10, 1000, loader, { swr: true })).toEqual({ data: "baru", stale: false });
  });
});
