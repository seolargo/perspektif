// Dev fill: API çağrısı yapmadan arayüzü örnek bir analizle doldurur.
// İçerik gerçek bir analiz çıktısından alınmıştır (Ekhlas tanıklığı).
export const DEV_FILL = {
  meta: [
    { id: "erkek_akli", display_name: "Sistemci Bakış", tagline: "Kapasite, sorumluluk, eylem", color: "#4f8cc9" },
    { id: "kadin_akli", display_name: "İlişkisel Bakış", tagline: "İnsan, bağ, yaşanmışlık", color: "#c95f8a" },
    { id: "ekonomist_akli", display_name: "Teşvik Bakışı", tagline: "Teşvikler, maliyetler, ikinci derece etkiler", color: "#5fae7f" },
  ],
  results: {
    erkek_akli: {
      takildigi: [
        "14 yaşında kaçırılıp seks kölesi yapılmış olması.",
        "Günlerce süren tecavüz, işkence ve sistematik alıkoyma uygulamaları.",
      ],
      yorumu: {
        problem_tanimi:
          "Devlet/uluslararası koruma mekanizmalarının çöküşü ve terör örgütünün sistematik cinsel köleleştirme pratiği.",
        nedensel_yorum:
          "Güvenlik boşlukları, örgütün kurumsallaşmış şiddet-ticareti mekanizmaları ve cezasızlık kültürü bu sonucu üretti.",
        ahlaki_degerlendirme:
          "Sorumlular; DEAŞ militanları ve güvenlik/istihbarat zafiyetleri açısından başarısız devlet aktörleri olarak değerlendirilmelidir.",
        cozum_onerisi:
          "Kaçırma/ticaret ağlarını hedef alan istihbarat, kurban koruma ve uluslararası adli takibat güçlendirilmeli.",
      },
      kacirdigi: [
        "Kurbanın uzun vadeli psikososyal sağlık ihtiyaçları ve rehabilitasyon detayları.",
        "Olayın yaşandığı yerel güvenlik aktörlerinin hangi somut hataları yaptığı veya müdahale kapasitesi.",
      ],
      duygusal_yuk: 0.95,
    },
    kadin_akli: {
      takildigi: [
        "Ekhlas'ın 14 yaşındayken kaçırılıp seks kölesi yapılması ve babasının gözleri önünde öldürülmesi.",
        "Günlerce süren tecavüz, dövülme, işkence ve çocukların da mağdur edilmesi anlatımı.",
      ],
      yorumu: {
        problem_tanimi:
          "İnsanların bedenlerinin ve güvenlik bağlarının sistematik olarak parçalanması, özellikle kadın ve çocukların derin travması.",
        nedensel_yorum:
          "Silahlı teröristlerin iktidar, cinsiyetçi şiddet ve savaş koşullarında insanları meta olarak görmesi.",
        ahlaki_degerlendirme:
          "Fail olan militanlar insanlık dışı ve cani; mağdurlar günahkar değil, korunması gereken travma yaşayan kişiler.",
        cozum_onerisi:
          "Hayatta kalanlara acil psikolojik, tıbbi ve sosyal destek sağlanmalı; adalet arayışı desteklenmeli.",
      },
      kacirdigi: [
        "Bu bireysel anlatının arkasındaki toplumsal yeniden inşa ve uzun vadeli destek ihtiyaçlarına dair ayrıntı.",
        "Olayın sayısal kapsamı, kurbanların kimlikleri ve kamusal hesap verebilirlik mekanizmalarının durumu.",
      ],
      duygusal_yuk: 0.98,
    },
    ekonomist_akli: {
      takildigi: [
        "14 yaşında Ekhlas'ın kaçırılması ve seks kölesi yapılması.",
        "Militanların sistematik cinsel ticaret ve fiziksel işkence yöntemleri.",
      ],
      yorumu: {
        problem_tanimi:
          "Sistemin kıt kaynak ve güç dinamikleriyle organize edilmiş insan ticareti ve cinsel sömürü üretmesi.",
        nedensel_yorum:
          "Silahlı örgütün iktidar, cinsiyetçi güvenlik zaafı ve piyasa-benzeri köle ticareti teşvikleri bunu yarattı.",
        ahlaki_degerlendirme:
          "Mağdurlar acil koruma ve tazminat hakkı; sorumlular uluslararası adalet önünde hesap vermeli.",
        cozum_onerisi:
          "Kaçırılanlara kaynak (barınma, sağlık, hukuk), suçlulara uluslararası kovuşturma ve finans akışlarının kesilmesi.",
      },
      kacirdigi: [
        "Mağdurların psikolojik, toplumsal onur kaybı ve uzun vadeli statü kayıpları fiyatlanamaz.",
        "Bazı bireysel motivasyonlar (inanç, travma tepkileri) sadece teşvikle açıklanamayabilir.",
      ],
      duygusal_yuk: 0.9,
    },
  },
  synthesis: {
    ton_notu:
      "Bu metin bir hayatta kalanın ağır cinsel şiddet ve savaş suçu tanıklığıdır; analitik dil kullanırken, Ekhlas ve benzeri mağdurların birer “örnek vaka” değil, özerk öznelere sahip insanlar olduğunu ve deneyimlerinin saygı ve mahremiyet gerektirdiğini unutmadan düşünmek gerekir.",
    entegre_okuma:
      "Bu hikâyede görülen, sadece “vahşi terörist şiddeti” değil; devlet ve uluslararası düzenin çöktüğü bir boşlukta, kadın ve çocuk bedenlerinin organize bir pazar mantığıyla metalaştırıldığı, aynı anda hem savaş silahı hem ödül hem de gelir kalemi yapıldığı bir rejim. Bu rejim mağdurları yalnızca fiziksel olarak değil, aidiyet bağlarını, güven duygularını, gelecek kurma kapasitelerini de hedef alarak yok etmeye çalışıyor. Dolayısıyla yanıt; güvenlik/istihbarat ve uluslararası adalet mekanizmalarını güçlendirmekle sınırlı kalamayacak, aynı anda travma odaklı uzun erimli destek, toplulukların yeniden inşası ve bu “pazarları” besleyen finansal, ideolojik ve cinsiyetçi yapıların köküne inen politikaları birlikte gerektirecek. Hiçbir düzey tek başına yeterli değil; güvenlik, adalet, ekonomik yaptırım ve toplumsal onarım birbirine eklemlenmek zorunda.",
    uzlasma: [
      "Yaşananlar bireysel sapma değil, örgütlü ve sistematik bir köleleştirme ve işkence rejimi olarak görülüyor.",
      "Fail konumunda açıkça DEAŞ militanları ve onları mümkün kılan cezasızlık/güvenlik zaafları; mağdurlar ise tartışmasız olarak korunması gereken kişiler olarak konumlanıyor.",
      "Çözümün hem uluslararası adalet/cezalandırma hem de hayatta kalanlara çok boyutlu destek (barınma, sağlık, hukuk vb.) gerektirdiği kabul ediliyor.",
    ],
    catisma: [
      "Sistemci Bakış devleti ve güvenlik mekanizmalarını merkeze alırken, İlişkisel Bakış deneyimin duygusal, bedensel ve ilişkisel yıkımını merkeze alıyor; öncelik evrenleri farklı.",
      "Teşvik Bakışı süreci teşvikler, kaynak akışları ve piyasa-benzeri “köle ticareti” kurgusu üzerinden okurken, İlişkisel Bakış bunu indirgemeci bulabilecek bir yerden daha çok travma ve özneleşme kaybına odaklanıyor.",
      "Sistemci Bakış yapısal güvenlik hataları ve istihbarat operasyonlarını konuşurken, İlişkisel Bakış ve kısmen Teşvik Bakışı daha çok mağdurların iyileşme, tazminat ve toplumsal onarım süreçlerini önceliyor.",
    ],
    kor_nokta_kapatmalari: [
      {
        kim: "İlişkisel Bakış",
        neyi_kapatti:
          "Sistemci Bakış'ın daha çok güvenlik ve ceza mekanizmalarına odaklanırken ihmal ettiği, beden bütünlüğü, yas, suçluluk duygusu ve uzun vadeli travma gerçekliğini görünür kılıyor.",
      },
      {
        kim: "Teşvik Bakışı",
        neyi_kapatti:
          "Hem Sistemci Bakış hem İlişkisel Bakış'ın yeterince formüle etmediği “kölelik/pazarlık” boyutunu; cinsel şiddetin aynı zamanda örgütün gelir, ödül ve kontrol mekanizması olduğunu açığa çıkarıyor.",
      },
      {
        kim: "Sistemci Bakış",
        neyi_kapatti:
          "İlişkisel Bakış ve Teşvik Bakışı'nın daha arka planda bıraktığı, devletlerin ve uluslararası sistemin somut güvenlik/istihbarat çöküşünü ve bu çöküş onarılmadan tekrarın önlenemeyeceğini vurguluyor.",
      },
    ],
  },
};
