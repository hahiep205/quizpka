import { describe, expect, it } from "vitest"
import { R2_PUBLIC_BASE, toBankUrl, toMediaUrl } from "./mediaUrl"

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

  it("sends kinh_te_vi_mo images to the R2 data/ prefix", () => {
    expect(toMediaUrl("kinh_te_vi_mo/images/do_thi_co_gian_cau.png")).toBe(`${R2_PUBLIC_BASE}/data/kinh_te_vi_mo/images/do_thi_co_gian_cau.png`)
  })

  it("passes through remote URLs and keeps other local assets on /data", () => {
    expect(toMediaUrl("https://cdn.example/x.png")).toBe("https://cdn.example/x.png")
    expect(toMediaUrl("/logo.svg")).toBe("/logo.svg")
    expect(toMediaUrl("")).toBeUndefined()
    expect(toMediaUrl(undefined)).toBeUndefined()
  })
})

describe("toBankUrl", () => {
  it("maps the free-subject bank paths onto the R2 data/ prefix", () => {
    expect(toBankUrl("/data/kinh_te_vi_mo/chuong_1.json")).toBe(`${R2_PUBLIC_BASE}/data/kinh_te_vi_mo/chuong_1.json`)
    expect(toBankUrl("/data/tadv/test01/test01.json")).toBe(`${R2_PUBLIC_BASE}/data/tadv/test01/test01.json`)
    expect(toBankUrl("/data/toeic-test/Test-01/Part1/test01-part1.json")).toBe(`${R2_PUBLIC_BASE}/data/toeic-test/Test-01/Part1/test01-part1.json`)
    expect(toBankUrl("/data/tu-tuong-hcm-giua-ky/tu_tuong_hcm_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/tu-tuong-hcm-giua-ky/tu_tuong_hcm_giua_ky.json`)
    expect(toBankUrl("/data/lich-su-dang-giua-ky/his_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/lich-su-dang-giua-ky/his_giua_ky.json`)
    expect(toBankUrl("/data/quan-tri-hoc-giua-ky/mgt_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/quan-tri-hoc-giua-ky/mgt_giua_ky.json`)
    expect(toBankUrl("/data/chu-nghia-khoa-hoc-xa-hoi-giua-ky/soc_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/chu-nghia-khoa-hoc-xa-hoi-giua-ky/soc_giua_ky.json`)
    expect(toBankUrl("/data/kinh-te-chinh-tri-mac-lenin-giua-ky/pec_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/kinh-te-chinh-tri-mac-lenin-giua-ky/pec_giua_ky.json`)
    expect(toBankUrl("/data/triet-hoc-mac-lenin-2tc-giua-ky/mln_2tc_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/triet-hoc-mac-lenin-2tc-giua-ky/mln_2tc_giua_ky.json`)
    expect(toBankUrl("/data/triet-hoc-mac-lenin-3tc-giua-ky/mln_3tc_giua_ky.json")).toBe(`${R2_PUBLIC_BASE}/data/triet-hoc-mac-lenin-3tc-giua-ky/mln_3tc_giua_ky.json`)
  })

  it("leaves non-bank paths untouched", () => {
    expect(toBankUrl("/data/some-legacy/file.json")).toBe("/data/some-legacy/file.json")
    expect(toBankUrl("/logo.svg")).toBe("/logo.svg")
    expect(toBankUrl("https://cdn.example/bank.json")).toBe("https://cdn.example/bank.json")
  })
})
