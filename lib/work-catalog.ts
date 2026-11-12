// The works list (Eser_Listesi.xlsx): practice tags, year and a one-line English description per work.
// Keyed by Notion page id. Works not listed here keep their derived tags and excerpt.
export type CatalogEntry = { tags: string[]; year: string; summary: string }

export const workCatalog: Record<string, CatalogEntry> = {
  '62d2c83c-d0e0-4654-90db-610ddb78bfc7': { tags: ['Street Art', 'Collage', 'Animation'], year: '2018 – present', summary: 'The project ongoing since 2018 and over 600+ individual unique collages created from 40+ different species were created and applied to the streets.' }, // Silent Steps
  '22a39248-8fe5-80c8-aae6-fcdebd717fb8': { tags: ['Street Art', 'Collage', 'Animation'], year: '2018–2022', summary: 'It took me nearly four years to capture the frames in this film. From beginning to end, in less than a minute, an entire lifetime passes before our eyes.' }, // Panda
  '25f39248-8fe5-80df-ac77-ca4a82b720c4': { tags: ['Street Art', 'Collage', 'Animation'], year: '2024', summary: "For this exhibition, I designed a 'relay race' animation that takes place partly in Istanbul and partly in Paris. My aim was to connect the streets of these two cities through the theme of a 'relay race.'" }, // Paris Olympics
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe': { tags: ['Street Art', 'Collage', 'Animation'], year: '2023', summary: 'Three different wild animals, 54 collages, on the streets of Milan. Ostrich, Bear, and Chameleon.' }, // Milan
  '30239248-8fe5-8018-85f0-d341175edced': { tags: ['Street Art', 'Collage', 'Exhibition'], year: '2026', summary: 'Eighteen elephants turned into a treasure-hunt game: throughout the festival, everyone who found an elephant was given a gift.' }, // UpCycle
  '1b039248-8fe5-80f7-9589-d1dd2ffbba93': { tags: ['Collage', 'Sound', 'Exhibition'], year: '2025', summary: 'A record shop at İMÇ. Collages on hand-cast concrete records, made to the size of vinyl, with songs produced through AI analysis.' }, // Volta
  'da5cf4ff-a5a7-4d81-b2b4-651d85c9a9d8': { tags: ['Painting', 'Animation'], year: '2019 – present', summary: 'Portraits formed by paint passed from one sheet of paper to the next, seven sheets at a time, with tiny stories and tiny films for each portrait.' }, // Eidōla
  'f4ec0763-6c97-4df6-88d6-4ff6631ec26c': { tags: ['Animation'], year: '2021', summary: 'Yes, somewhere — or anywhere.' }, // Somewhere
  '22a39248-8fe5-8077-8278-ccc0674023b1': { tags: ['Animation'], year: '2021', summary: 'Teleport between two synchronized videos' }, // Rabbit Hole
  '25f39248-8fe5-80b9-9041-d50804c968cf': { tags: ['Animation'], year: '2017', summary: "Just Because You're Paranoid, Doesn't Mean They're Not After You" }, // Just Because You're Paranoid
  '25f39248-8fe5-806f-bada-c95b0519b8f6': { tags: ['Animation'], year: '2022', summary: 'GOT' }, // G.O.T.
  '25f39248-8fe5-8048-97c3-e58496e8b2cd': { tags: ['Animation'], year: '2024', summary: 'Hope' }, // Hope
  '2e639248-8fe5-80cc-a7c3-c51c30088b4e': { tags: ['Collage', 'Exhibition'], year: '2025', summary: 'Aquarium fish on an old map of Ankara' }, // Re-Map
  '26c39248-8fe5-80ae-a265-ee5989cd0311': { tags: ['Street Art', 'Collage', 'Animation'], year: '2022', summary: 'One Of Us' }, // One Of Us
  '33239248-8fe5-8018-b85b-cbdb6ba6e03f': { tags: ['Sculpture', 'Installation', 'Exhibition'], year: '2026', summary: 'A statue of a musician who flatly refuses to play requests.' }, // İstek Şarkı…
  '33239248-8fe5-80b8-95e0-c3971654c746': { tags: ['Sculpture', 'Installation', 'Exhibition'], year: '2026', summary: 'Find What You Love and Let It Kill You' }, // Find What You Love
  '33239248-8fe5-8035-b6e9-ceb07a9c84fd': { tags: ['Sculpture', 'Installation', 'Exhibition'], year: '2026', summary: 'Jinn hidden in boxes, made manifest.' }, // Jinns – Bent Souls
  '3ec39248-8fe5-8095-845c-f590582f19c9': { tags: ['Exhibition', 'Assemblage'], year: '2026', summary: 'Songs from the Uzelli psychedelic Anatolian album.' }, // Re-Cover
  'bd62c75c-ff0b-4b11-a857-1ea394db1d59': { tags: ['Animation', 'Digital'], year: '2021', summary: 'Fifteen animals in fifteen frames, grouped in threes to form impossible triplets.' }, // Night Watch
  '4902f670-013a-4661-8234-1cc6d94f00d4': { tags: ['Street Art', 'Digital'], year: '2022', summary: 'The Running of the Bulls.' }, // Night Watch, Bull Run Edition
  '22a39248-8fe5-80f2-8c33-e898a8fc01a6': { tags: ['Collage', 'Assemblage', 'Exhibition'], year: '2019', summary: 'The Mamut Art exhibition, 2019 edition.' }, // Mamut Art
  '22a39248-8fe5-8050-8c6f-d28fd81cb677': { tags: ['Sculpture', 'Installation'], year: '2018 – present', summary: 'Some heads, some faces.' }, // Faces
}

// Dropped from the works list.
export const removedWorkIds = new Set(['26c39248-8fe5-80ff-b74c-f811b5bc29c0']) // Figures

// New works, each a page of its own. They sit at the end of the list.
// A work opens either on its YouTube film, or on its own text (`paragraphs`) followed by hosted videos (`videos`).
// A list inside `videos` is shown as a row of small films side by side.
// `cover` is the card picture; without it the YouTube thumbnail is used.
export type AddedWork = { id: string; title: string; titleNote?: string; youtube?: string; cover?: string; paragraphs?: string[]; videos?: (string | string[])[]; entry: CatalogEntry }

export const addedWorks: AddedWork[] = [
  { id: 'added-back-to-the-commencis', title: 'Back To The Commencis', youtube: 'ZB-MkNMHO9E', entry: { tags: ['Street Art', 'Collage', 'Animation'], year: '2024', summary: 'A hovercraft rider on the Commencis building and in the streets of Istanbul.' } },
  { id: 'added-human-zer0', title: 'Human Zer0', youtube: '6FZXAGun2Gs', entry: { tags: ['Street Art', 'Collage', 'Animation'], year: '2021', summary: 'A madman in a VR headset on the streets of Istanbul. Who knows where they think they are.' } },
  {
    id: 'added-arsa-payi',
    title: 'Arsa Payı',
    titleNote: 'Yıkım Ekibi', // shown beside the title
    cover: 'https://res.cloudinary.com/epzod3uc/image/upload/v1793888874/YIKIM-EK%C4%B0B%C4%B0-----_lksef5.gif',
    paragraphs: [
      'Arsa Payı; 4 farklı ülkeden, toplamda 73 bağımsız sanatçıyı yıkım kararı alınmış bir apartman dairesinde bir araya getirdi. Bir ay süren çalışmaların ardından kapılarını sizlere bir günlüğüne açıyor.',
      'Tamamen gönüllülük ilkesiyle çalışan sanatçılar, işlerini kaybedeceklerini bile bile üretimlerini gerçekleştirdiler. Ve yıkım öncesi sizlere sunmaya hazırlar.',
      'Sizlerden kendinize şu soruları sorarak sergiye gelmenizi arzuluyoruz. "Kaybedeceğimi bildiğim bir şey için çaba gösterir miydim? Ve her şeyin sahibi olabilir miyim?"',
      '🗓 12 Eylül 2026 — yalnızca bir gün 14:00, 19:00 saatleri arasında gerçekleşti.',
    ],
    videos: [
      'https://res.cloudinary.com/epzod3uc/video/upload/v1793890050/YIKIM_EK%C4%B0B%C4%B0v2_c10p6c.mp4',
      // Three small films side by side, left to right: the sketch, the coloured paper, the wall.
      [
        'https://res.cloudinary.com/epzod3uc/video/upload/v1793887176/YIKIM_EK%C4%B0B%C4%B0v3-a_vqvovy.mp4',
        'https://res.cloudinary.com/epzod3uc/video/upload/v1793887158/YIKIM_EK%C4%B0B%C4%B0v3-b_iigsqs.mp4',
        'https://res.cloudinary.com/epzod3uc/video/upload/v1793887180/YIKIM_EK%C4%B0B%C4%B0v3-c_fjxkzu.mp4',
      ],
      'https://res.cloudinary.com/epzod3uc/video/upload/v1793887081/Y%C4%B1k%C4%B1m_ba%C5%9Fl%C4%B1yor_oqnuki.mp4',
    ],
    entry: { tags: ['Exhibition', 'Street Art', 'Collage', 'Animation'], year: '2026', summary: 'Arsa Payı; 4 farklı ülkeden, toplamda 73 bağımsız sanatçıyı yıkım kararı alınmış bir apartman dairesinde bir araya getirdi.' },
  },
]
