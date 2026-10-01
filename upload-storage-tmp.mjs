import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const B = createClient(process.env.B_URL, process.env.B_KEY)
const map = [
  // supabase/paid-banks loose: {subj}_{rest} -> {subj}/{rest}
  ['supabase/paid-banks/civ101_lich_su_van_minh_the_gioi.json','civ101/lich_su_van_minh_the_gioi.json'],
  ['supabase/paid-banks/dm101_toan_roi_rac_quiz.json','dm101/toan_roi_rac_quiz.json'],
  ['supabase/paid-banks/eco101_kinh_te_hoc.json','eco101/kinh_te_hoc.json'],
  ['supabase/paid-banks/hcm101_tu_tuong_hcm.json','hcm101/tu_tuong_hcm.json'],
  ['supabase/paid-banks/his101_lich_su_dang.json','his101/lich_su_dang.json'],
  ['supabase/paid-banks/law101_phap_luat_dai_cuong.json','law101/phap_luat_dai_cuong.json'],
  ['supabase/paid-banks/mgt101_quan_tri_hoc.json','mgt101/quan_tri_hoc.json'],
  ['supabase/paid-banks/mln101_triet_hoc_mln_2tc.json','mln101/triet_hoc_mln_2tc.json'],
  ['supabase/paid-banks/mln102_triet_hoc_mln_3tc.json','mln102/triet_hoc_mln_3tc.json'],
  ['supabase/paid-banks/oit101_tin_hoc_van_phong.json','oit101/tin_hoc_van_phong.json'],
  ['supabase/paid-banks/pec101_kinh_te_chinh_tri.json','pec101/kinh_te_chinh_tri.json'],
  ['supabase/paid-banks/rm101_phuong_phap_nghien_cuu.json','rm101/phuong_phap_nghien_cuu.json'],
  ['supabase/paid-banks/rm102_nghien_cuu_khoa_hoc_trong_kinh_te.json','rm102/nghien_cuu_khoa_hoc_trong_kinh_te.json'],
  ['supabase/paid-banks/soc101_chu_nghia_xa_hoi.json','soc101/chu_nghia_xa_hoi.json'],
  ['supabase/paid-banks/ta101_tieng_anh_1_quiz.json','ta101/tieng_anh_1_quiz.json'],
  ['supabase/paid-banks/tadv02_test02.json','tadv02/test02.json'],
  ['supabase/paid-banks/tadv02_test03.json','tadv02/test03.json'],
  ['supabase/paid-banks/tadv02_test04.json','tadv02/test04.json'],
  ['supabase/paid-banks/tadv02_test05.json','tadv02/test05.json'],
  ['supabase/paid-banks/tadv02_test06.json','tadv02/test06.json'],
  // paid-banks images: giữ nguyên path
  ['supabase/paid-banks/dst101/de1.png','dst101/de1.png'],
  ['supabase/paid-banks/gt101/giai-tich-de1.png','gt101/giai-tich-de1.png'],
  ['supabase/paid-banks/gt101/giai-tich-de2.png','gt101/giai-tich-de2.png'],
  ['supabase/paid-banks/phy101/vatly1-de1-img1.jpg','phy101/vatly1-de1-img1.jpg'],
  ['supabase/paid-banks/phy101/vatly1-de1-img2.jpg','phy101/vatly1-de1-img2.jpg'],
  ['supabase/paid-banks/phy101/vatly1-de2-img1.jpg','phy101/vatly1-de2-img1.jpg'],
  ['supabase/paid-banks/phy101/vatly1-de2-img2.jpg','phy101/vatly1-de2-img2.jpg'],
  ['supabase/paid-banks/phy101/vatly1-de3-img1.jpg','phy101/vatly1-de3-img1.jpg'],
  ['supabase/paid-banks/phy101/vatly1-de3-img2.jpg','phy101/vatly1-de3-img2.jpg'],
  ['supabase/paid-banks/ppt101/ppt-giuaky.png','ppt101/ppt-giuaky.png'],
  ['supabase/paid-banks/ppt102/ppt-01.png','ppt102/ppt-01.png'],
  ['supabase/paid-banks/ppt102/ppt-02.png','ppt102/ppt-02.png'],
  ['supabase/paid-banks/xst101/de1.png','xst101/de1.png'],
  // mar101 + sta201 từ public/data
  ...Array.from({length:9},(_,i)=>[`public/data/marketing-can-ban/chuong_${i+1}.json`,`mar101/chuong_${i+1}.json`]),
  ['public/data/thong-ke-trong-kinh-doanh/thong_ke_kinh_doanh.json','sta201/thong_ke_kinh_doanh.json'],
  ...Array.from({length:8},(_,i)=>[`public/data/thong-ke-trong-kinh-doanh/${i+1}.png`,`sta201/tkkd-de-cuoi-ky-${i+1}.png`]),
  // dm101/ta101 ảnh + banks đơn
  ['public/data/de-toan-roi-rac-3tc/de-tu-luan-2-img1.png','dm101/de-tu-luan-2-img1.png'],
  ['public/data/de-toan-roi-rac-3tc/de-tu-luan-2-img2.png','dm101/de-tu-luan-2-img2.png'],
  ['public/data/de-toan-roi-rac-3tc/de-tu-luan-3-img1.png','dm101/de-tu-luan-3-img1.png'],
  ['public/data/de-toan-roi-rac-3tc/de-tu-luan-3-img2.png','dm101/de-tu-luan-3-img2.png'],
  ['public/data/tieng-anh-1/cau-truc-de.png','ta101/cau-truc-de.png'],
  ['public/data/kinh-te-vix-mo/kinh_te_vi_mo.json','mac102/kinh_te_vi_mo.json'],
  ['public/data/nguyen-ly-tai-chinh/nguyen_ly_tai_chinh.json','fin101/nguyen_ly_tai_chinh.json'],
  ['public/data/nhap-mon-khoa-hoc-du-lieu-va-tri-tue-nhan-tao/nhap_mon_khdl_ttnt.json','idsai101/nhap_mon_khdl_ttnt.json'],
  ['paid-banks-staging/db101-co_so_du_lieu.json','db101/co_so_du_lieu.json'],
]
const ct = p => p.endsWith('.png') ? 'image/png' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/json'
let ok = 0, fail = 0
for (const [src, dst] of map) {
  let buf
	try { buf = readFileSync(src) } catch { console.log('SKIP missing', src); continue }
	const { error } = await B.storage.from('paid-question-banks').upload(dst, buf, { upsert: true, contentType: ct(dst) })
  if (error) { fail++; console.log('FAIL', dst, error.message) } else ok++
}
console.log('UPLOAD DONE', { ok, fail, total: map.length })