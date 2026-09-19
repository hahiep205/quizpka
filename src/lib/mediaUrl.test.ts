import { describe, expect, it } from "vitest"
import { R2_PUBLIC_BASE, toMediaUrl } from "./mediaUrl"

describe("toMediaUrl", () => {
  it("sends TADV audio and flattened part 5 images to R2", () => {
    expect(toMediaUrl("tadv/test01/part1-audio.mp3")).toBe(`${R2_PUBLIC_BASE}/tadv/test01/part1-audio.mp3`)
    expect(toMediaUrl("/data/tadv/test01/part2-audio.mp3")).toBe(`${R2_PUBLIC_BASE}/tadv/test01/part2-audio.mp3`)
    expect(toMediaUrl("tadv/test01/part5-image-test1/5.png")).toBe(`${R2_PUBLIC_BASE}/tadv/test01/5.png`)
    expect(toMediaUrl("tadv-traphi/test02/part5-image-test2/1.png")).toBe(`${R2_PUBLIC_BASE}/tadv-traphi/test02/1.png`)
    expect(toMediaUrl("tadv-traphi/test06/part5-image-test6/5.png")).toBe(`${R2_PUBLIC_BASE}/tadv-traphi/test06/5.png`)
  })

  it("rewrites TOEIC media from toeic-test/ onto the toeic/ R2 prefix", () => {
    expect(toMediaUrl("/data/toeic-test/Test-01/Part1/p1_q001.mp3")).toBe(`${R2_PUBLIC_BASE}/toeic/Test-01/Part1/p1_q001.mp3`)
    expect(toMediaUrl("/data/toeic-test/Test-01/Part1/p1_q001.webp")).toBe(`${R2_PUBLIC_BASE}/toeic/Test-01/Part1/p1_q001.webp`)
    expect(toMediaUrl("toeic-test/Test-02/Part3/p3_g05_image.png")).toBe(`${R2_PUBLIC_BASE}/toeic/Test-02/Part3/p3_g05_image.png`)
    expect(toMediaUrl("/data/toeic-test/Test-03/Part4/p4_g01_audio.mp3")).toBe(`${R2_PUBLIC_BASE}/toeic/Test-03/Part4/p4_g01_audio.mp3`)
  })

  it("sends hero videos to R2", () => {
    expect(toMediaUrl("/animo-column-drift-720p.webm")).toBe(`${R2_PUBLIC_BASE}/animo-column-drift-720p.webm`)
    expect(toMediaUrl("/animo-column-drift-720p-dark.webm")).toBe(`${R2_PUBLIC_BASE}/animo-column-drift-720p-dark.webm`)
  })

  it("passes through remote URLs and keeps other local assets on /data", () => {
    expect(toMediaUrl("https://cdn.example/x.png")).toBe("https://cdn.example/x.png")
    expect(toMediaUrl("kinh_te_vi_mo/images/do_thi_co_gian_cau.png")).toBe("/data/kinh_te_vi_mo/images/do_thi_co_gian_cau.png")
    expect(toMediaUrl("/logo.svg")).toBe("/logo.svg")
    expect(toMediaUrl("")).toBeUndefined()
    expect(toMediaUrl(undefined)).toBeUndefined()
  })
})
