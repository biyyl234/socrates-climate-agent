import { describe, expect, it } from "vitest";
import {
  createResilientTts,
  createTtsAdapter,
  MockTts,
  NoTts,
  TtsError,
  VolcanoTts,
} from "../../src/adapters/tts";

describe("MockTts", () => {
  it("returns metadata and placeholder chunks without audio bytes", async () => {
    const tts = new MockTts();
    const result = await tts.synthesize({ text: "我们先看看套餐差异。", format: "audio/mp3" });
    expect(result.characters).toBe("我们先看看套餐差异。".length);
    expect(result.voice).toBe("zh-CN-mock");
    expect(result.chunks).toHaveLength(1);
    expect(result.visemes).toEqual([]);
  });

  it("splits long utterances by sentence", () => {
    const tts = new MockTts();
    const chunks = tts.splitBySentence("第一句。第二句！第三句？");
    expect(chunks).toHaveLength(3);
  });
});

describe("NoTts fallback", () => {
  it("reports unavailable and rejects synthesis", async () => {
    const tts = new NoTts();
    expect(tts.available).toBe(false);
    await expect(tts.synthesize({ text: "x" })).rejects.toThrow(TtsError);
  });
});

describe("VolcanoTts placeholder", () => {
  it("throws missing-credentials when config fields are empty", () => {
    expect(
      () =>
        new VolcanoTts({
          appId: "",
          accessToken: "",
          cluster: "",
          voiceType: "",
        }),
    ).toThrow(TtsError);
  });

  it("maps audio format to upstream encoding", () => {
    const tts = new VolcanoTts({
      appId: "app",
      accessToken: "tok",
      cluster: "volcano_tts",
      voiceType: "zh_male",
    });
    const payload = tts.buildPayload("你好", 1, "audio/wav", "sess_1");
    expect(payload.audio.encoding).toBe("wav");
    const mp3 = tts.buildPayload("你好", 1, "audio/mp3");
    expect(mp3.audio.encoding).toBe("mp3");
  });

  it("calls the TTS endpoint with the Bearer; auth header and parses base64 audio", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ code: 3000, data: "QUJDREVGRw==" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const tts = new VolcanoTts({
      appId: "app",
      accessToken: "tok",
      cluster: "volcano_tts",
      voiceType: "zh_male",
      fetchImpl,
    });
    const result = await tts.synthesize({ text: "你好", format: "audio/mp3" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://openspeech.bytedance.com/api/v1/tts");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer;tok");
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]!.dataBase64).toBe("QUJDREVGRw==");
  });

  it("maps a non-ok upstream response to a TtsError", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const tts = new VolcanoTts({
      appId: "app",
      accessToken: "tok",
      cluster: "volcano_tts",
      voiceType: "zh_male",
      fetchImpl,
    });
    await expect(tts.synthesize({ text: "你好" })).rejects.toThrow(TtsError);
  });
});

describe("TTS factory", () => {
  it("creates NoTts for the none provider", () => {
    expect(createTtsAdapter({ provider: "none" }, {})).toBeInstanceOf(NoTts);
  });

  it("defaults to mock offline TTS", () => {
    expect(createTtsAdapter({}, {})).toBeInstanceOf(MockTts);
  });

  it("resilient builder falls back to NoTTS when Volcano credentials are absent", () => {
    expect(createResilientTts({}, {})).toBeInstanceOf(NoTts);
  });
});
