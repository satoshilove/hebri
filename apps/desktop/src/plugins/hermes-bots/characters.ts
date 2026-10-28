/** Original Hebri artwork. Kept as trusted SVG templates, shared with the pet atlas builder.
 * Shape IDs persist in profile metadata; unknown/legacy IDs are handled by the caller.
 */
export const CHARACTER_PALETTES = [
  ['Cobalt', '#214fbb', '#66dbff', '#fff1d7'],
  ['Aurora', '#36554b', '#b8f57d', '#eff9d8'],
  ['Coral', '#a13558', '#ffad80', '#ffe9dc'],
  ['Lilac', '#6247a6', '#d8b4ff', '#f2e8ff'],
  ['Amber', '#97502a', '#ffce62', '#fff0ca'],
  ['Glacier', '#366d89', '#92f5e9', '#ecfcff'],
  ['Rose', '#8c376d', '#ff9ece', '#fff0f6'],
  ['Matcha', '#52692d', '#d4ec78', '#f3f2d6'],
  ['Midnight', '#283849', '#94bbff', '#dce5f2'],
  ['Ember', '#a13c28', '#ffbb72', '#fff1dc'],
  ['Pearl', '#666875', '#c8d7ff', '#fff8ea'],
  ['Electric', '#5735a6', '#c4ff4f', '#f4edff']
] as const
export const HEBRI_CHARACTERS = [
  ['Sage', 'The Hebri original', 'sage', 0],
  ['Orbit', 'A small machine, a big personality', 'orbit', 5],
  ['Kitsu', 'An alert little explorer', 'fox', 4],
  ['Luma', 'A quiet night companion', 'owl', 11],
  ['Pebble', 'Small stone, steady presence', 'pebble', 10],
  ['Prism', 'A floating crystal mind', 'prism', 3],
  ['Nova', 'A pocketful of starlight', 'nova', 4],
  ['Nimbus', 'A cloud with curious eyes', 'nimbus', 5],
  ['Sprout', 'An idea taking root', 'sprout', 7],
  ['Ember', 'A little spark of energy', 'ember', 9],
  ['Ripple', 'A drop of calm', 'ripple', 0],
  ['Mochi', 'Soft, squishy, slightly strange', 'mochi', 6],
  ['Halo', 'A loop with a point of view', 'halo', 11],
  ['Comet', 'Always going somewhere', 'comet', 2],
  ['Pixel', 'A playful stack of possibilities', 'pixel', 8],
  ['Tangle', 'A thought with a twist', 'tangle', 3],
  ['Luna', 'A crescent with character', 'luna', 10],
  ['Shroom', 'A tiny forest daydream', 'shroom', 2],
  ['Echo', 'A living little waveform', 'echo', 1],
  ['Glint', 'Geometry with attitude', 'glint', 5]
] as const

export function parseCharacterShape(shape: string) {
  const [prefix, kind, palette, extra] = shape.split(':')
  const character = HEBRI_CHARACTERS.find(c => c[2] === kind)
  const index = Number(palette)

  if (
    prefix !== 'hebri' ||
    !character ||
    extra !== undefined ||
    !/^\d+$/.test(palette ?? '') ||
    !CHARACTER_PALETTES[index]
  ) {
    return null
  }

  return { kind, palette: index, name: character[0] }
}

export function characterShape(kind: string, palette: number) {
  return `hebri:${kind}:${palette}`
}

function eyes(x1: number, x2: number, y: number, robot = false) {
  return `<g class="hs-eyes"><g class="hs-eye"><ellipse cx="${x1}" cy="${y}" rx="8.5" ry="9.5" fill="${robot ? 'var(--hs-accent)' : '#fff9ee'}"/><g class="hs-look"><ellipse cx="${x1 + 0.8}" cy="${y + 0.6}" rx="4.1" ry="5.5" class="hs-iris"/><ellipse cx="${x1 + 1}" cy="${y + 0.6}" rx="2.3" ry="4.3" fill="#132334"/><circle cx="${x1 - 0.5}" cy="${y - 2.1}" r="1.6" fill="#fff"/></g></g><g class="hs-eye"><ellipse cx="${x2}" cy="${y}" rx="8.5" ry="9.5" fill="${robot ? 'var(--hs-accent)' : '#fff9ee'}"/><g class="hs-look"><ellipse cx="${x2 + 0.8}" cy="${y + 0.6}" rx="4.1" ry="5.5" class="hs-iris"/><ellipse cx="${x2 + 1}" cy="${y + 0.6}" rx="2.3" ry="4.3" fill="#132334"/><circle cx="${x2 - 0.5}" cy="${y - 2.1}" r="1.6" fill="#fff"/></g></g></g>`
}

const smile =
  '<path d="M53 80 Q60 86 67 80" fill="none" stroke="var(--hs-light)" stroke-width="3" stroke-linecap="round"/>'

const drawings: Record<string, (paint: string) => string> = {
  sage: paint => `
   <path d="M34 111 Q28 91 38 79 L81 79 Q93 94 86 116 L34 116Z" fill="${paint}"/>
   <path d="M46 89 L60 108 74 89 82 101 68 123 52 123 38 101Z" fill="var(--hs-light)"/>
   <path d="M48 104 L60 115 73 104" fill="none" stroke="var(--hs-accent)" stroke-width="4"/>
   <ellipse cx="45" cy="125" rx="13" ry="5" fill="var(--hs-fur)"/><ellipse cx="76" cy="125" rx="13" ry="5" fill="var(--hs-fur)"/>
   <g class="hs-wing"><path d="M84 93 Q101 95 96 107" fill="none" stroke="var(--hs-fur)" stroke-width="12" stroke-linecap="round"/><circle cx="96" cy="108" r="6" fill="var(--hs-light)"/></g>
   <path d="M30 95 Q22 102 29 112" fill="none" stroke="var(--hs-fur)" stroke-width="11" stroke-linecap="round"/>
   <g class="hs-head">
   <path d="M25 61 Q12 37 27 25 Q31 12 49 15 Q52 1 68 9 Q87 7 90 23 Q108 29 99 49 Q108 65 94 76 L29 80Z" fill="${paint}"/>
   <path d="M33 43 Q47 42 50 28 Q60 43 81 35 Q94 42 91 60 Q90 87 60 93 Q31 83 29 61Z" fill="var(--hs-light)"/>
   <path d="M29 65 Q38 67 44 72 Q59 64 76 72 Q86 65 91 63 Q96 91 78 98 L60 109 41 98 Q24 87 29 65Z" fill="${paint}"/>
   <path d="M40 79 Q49 71 60 79 Q71 71 81 79 Q72 90 60 84 Q48 90 40 79Z" fill="var(--hs-fur)"/>
   <path d="M44 91 Q46 98 50 99 M58 89 L60 101 M71 92 L69 99 M28 35 Q37 20 47 24 M59 18 Q73 11 80 23" fill="none" stroke="var(--hs-accent)" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round"/>
   ${eyes(44, 76, 56)}
   <path d="M34 43 Q43 37 51 42 M69 42 Q78 37 85 43" fill="none" stroke="var(--hs-fur)" stroke-width="4.5" stroke-linecap="round"/>
   <path d="M58 61 Q54 71 63 69" fill="none" stroke="var(--hs-fur)" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
   <path class="hs-mouth" d="M54 83 Q60 87 66 83" fill="none" stroke="var(--hs-light)" stroke-width="2" stroke-linecap="round"/>
   </g>`,
  orbit: paint => `
   <path class="hs-tail" d="M32 102 Q9 107 23 118" fill="none" stroke="var(--hs-accent)" stroke-width="6" stroke-linecap="round"/>
   <path d="M39 86 Q29 107 41 119 Q60 130 80 118 Q92 105 81 86Z" fill="${paint}"/>
   <path d="M43 96 Q59 91 78 96 L74 112 Q60 120 46 112Z" fill="var(--hs-light)"/>
   <path d="M52 99 L52 110 M68 99 L68 110 M52 104 L68 104" fill="none" stroke="var(--hs-fur)" stroke-width="3.5" stroke-linecap="round"/>
   <ellipse cx="42" cy="125" rx="11" ry="5" fill="var(--hs-fur)"/><ellipse cx="79" cy="125" rx="11" ry="5" fill="var(--hs-fur)"/>
   <g class="hs-wing"><rect x="85" y="91" width="13" height="21" rx="6" fill="var(--hs-accent)"/></g><rect x="23" y="91" width="13" height="21" rx="6" fill="var(--hs-accent)"/>
   <g class="hs-head"><path d="M60 22 L60 14" stroke="var(--hs-fur)" stroke-width="5"/><circle cx="60" cy="10" r="5" fill="var(--hs-accent)"/>
   <rect x="18" y="28" width="85" height="61" rx="26" fill="${paint}"/>
   <rect x="25" y="39" width="71" height="40" rx="19" fill="#142639"/>
   <rect x="10" y="48" width="9" height="22" rx="4" fill="var(--hs-accent)"/><rect x="102" y="48" width="9" height="22" rx="4" fill="var(--hs-accent)"/>
   <path d="M36 33 Q56 25 80 33" fill="none" stroke="var(--hs-light)" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
   ${eyes(44, 77, 56, true)}<path class="hs-mouth" d="M55 72 Q61 76 67 72" fill="none" stroke="var(--hs-accent)" stroke-width="2" stroke-linecap="round"/></g>`,
  fox: paint => `
   <path class="hs-tail" d="M76 117 Q112 122 111 83 Q96 87 92 98 Q91 109 76 106Z" fill="${paint}"/>
   <path d="M109 83 Q111 94 105 103 L97 95Z" fill="var(--hs-light)"/>
   <path d="M39 84 Q31 105 41 122 L81 122 Q89 103 79 83Z" fill="${paint}"/>
   <path d="M49 92 Q60 86 72 93 L69 119 53 119Z" fill="var(--hs-light)"/>
   <path d="M37 83 Q59 91 84 82 L80 94 40 95Z" fill="var(--hs-accent)"/><path d="M72 92 L88 112 73 117 65 94Z" fill="var(--hs-accent)"/>
   <ellipse cx="44" cy="125" rx="11" ry="5" fill="var(--hs-fur)"/><ellipse cx="76" cy="125" rx="11" ry="5" fill="var(--hs-fur)"/>
   <g class="hs-wing"><path d="M82 94 Q95 99 90 109" fill="none" stroke="var(--hs-fur)" stroke-width="10" stroke-linecap="round"/></g>
   <g class="hs-head"><path d="M29 41 L24 8 Q42 13 49 29 Q60 24 72 29 Q84 13 102 8 L94 43 Q107 65 85 80 Q60 98 35 80 Q14 64 29 41Z" fill="${paint}"/>
   <path d="M30 19 L34 42 44 33Z M94 19 L89 42 78 33Z" fill="var(--hs-light)"/>
   <path d="M26 59 Q38 58 52 68 L60 77 69 68 Q84 58 98 59 Q94 79 60 90 Q28 78 26 59Z" fill="var(--hs-light)"/>
   ${eyes(43, 78, 54)}<path d="M54 73 Q60 69 66 73 L60 79Z" fill="#182b38"/>
   <path class="hs-mouth" d="M52 81 Q60 86 68 81" fill="none" stroke="#182b38" stroke-width="1.8" stroke-linecap="round"/>
   <path d="M28 69 L18 66 M29 74 L18 76 M94 68 L104 65 M93 74 L104 76" stroke="var(--hs-fur)" stroke-width="2" stroke-linecap="round"/></g>`,
  owl: paint => `
   <path d="M29 68 Q18 119 60 127 Q101 120 91 68Z" fill="${paint}"/>
   <path d="M43 80 Q60 73 77 80 L80 107 Q60 127 40 108Z" fill="var(--hs-light)"/>
   <path d="M48 94 L53 98 58 94 M63 94 L68 98 73 94 M54 104 L60 109 66 104" fill="none" stroke="var(--hs-fur)" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>
   <path d="M31 83 Q17 94 28 113 L40 105Z" fill="var(--hs-fur)"/><g class="hs-wing"><path d="M89 83 Q105 94 93 113 L80 105Z" fill="var(--hs-fur)"/><path d="M95 93 L88 103" stroke="var(--hs-accent)" stroke-width="2.5" stroke-linecap="round"/></g>
   <path d="M42 124 L37 130 M44 124 L45 130 M76 124 L75 130 M78 124 L83 130" stroke="var(--hs-accent)" stroke-width="4" stroke-linecap="round"/>
   <g class="hs-head"><path d="M24 38 L22 15 44 25 Q60 20 77 25 L99 15 95 38 Q109 61 89 79 Q59 99 30 78 Q10 61 24 38Z" fill="${paint}"/>
   <path d="M27 44 Q43 28 60 44 Q78 29 94 44 Q100 69 81 77 Q68 79 60 69 Q48 82 32 74 Q20 65 27 44Z" fill="var(--hs-light)"/>
   <path d="M29 42 Q45 33 57 44 M64 44 Q78 33 91 41" stroke="var(--hs-accent)" stroke-width="3" fill="none" stroke-linecap="round"/>
   ${eyes(42, 79, 56)}<path d="M53 69 Q60 63 67 69 L60 79Z" fill="var(--hs-accent)"/>
   <path d="M49 27 L60 34 71 27" fill="none" stroke="var(--hs-light)" stroke-opacity=".6" stroke-width="2"/></g>`,
  pebble: paint =>
    `<g class="hs-head"><path d="M18 82 L26 41 48 23 78 27 99 49 105 89 83 113 42 117 17 99Z" fill="${paint}"/><path d="M26 41 L48 23 78 27 64 39 40 49Z" fill="var(--hs-light)" opacity=".4"/><path d="M18 82 L42 117 83 113 70 101 35 98Z" fill="var(--hs-accent)" opacity=".4"/>${eyes(44, 76, 64)}${smile}<path d="M80 35 L75 44 83 47 M29 92 L38 86" fill="none" stroke="var(--hs-light)" opacity=".4" stroke-width="2"/><circle cx="35" cy="76" r="3" fill="var(--hs-accent)"/><circle cx="86" cy="76" r="3" fill="var(--hs-accent)"/></g>`,
  prism: paint =>
    `<g class="hs-head"><path d="M60 9 L94 40 102 83 60 122 18 83 26 40Z" fill="${paint}"/><path d="M60 9 L47 43 18 83 26 40Z" fill="var(--hs-accent)"/><path d="M60 9 L94 40 73 43Z M18 83 L60 122 47 86Z" fill="var(--hs-light)" opacity=".6"/><path d="M47 43 L73 43 83 84 60 110 37 84Z" fill="var(--hs-fur)"/><path d="M94 40 L102 83 60 122 83 84Z" fill="var(--hs-accent)" opacity=".5"/>${eyes(44, 76, 63)}${smile}</g><circle cx="17" cy="110" r="3" fill="var(--hs-accent)"/><circle cx="105" cy="23" r="4" fill="var(--hs-accent)"/>`,
  nova: paint =>
    `<g class="hs-head"><path d="M60 12 Q65 12 74 43 L104 46 Q115 48 92 72 L101 106 Q102 116 73 99 L60 92 27 112 Q18 116 26 84 L29 73 7 52 Q3 43 39 43 L54 17Z" fill="${paint}"/><path d="M60 24 L69 48 96 52 76 58 60 40 43 58 24 52 48 49Z" fill="var(--hs-accent)" opacity=".65"/>${eyes(44, 76, 66)}<path d="M53 82 Q60 91 67 82" stroke="var(--hs-light)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
  nimbus: paint =>
    `<g class="hs-tail"><path d="M35 104 L31 119 M61 106 L57 124 M85 102 L81 117" stroke="var(--hs-accent)" stroke-width="6" stroke-linecap="round"/></g><g class="hs-head"><path d="M22 93 C-2 88 5 59 24 58 C17 27 49 18 62 37 C81 15 108 35 98 57 C121 62 114 94 94 95Z" fill="${paint}"/><path d="M26 48 Q28 28 47 36 M69 42 Q83 28 93 46" fill="none" stroke="var(--hs-light)" stroke-width="5" stroke-linecap="round" opacity=".6"/>${eyes(44, 76, 65)}${smile}</g>`,
  sprout: paint =>
    `<path d="M34 93 L40 121 Q60 132 80 121 L86 93Z" fill="var(--hs-accent)"/><path d="M44 111 L76 111" stroke="var(--hs-light)" stroke-width="3"/><g class="hs-head"><path d="M59 40 Q36 39 29 15 Q55 9 61 34 Q66 7 93 14 Q88 37 65 40" fill="var(--hs-accent)"/><path d="M60 41 L60 26" stroke="var(--hs-fur)" stroke-width="3"/><path d="M22 65 Q20 39 60 39 Q100 39 98 65 L92 97 Q60 108 28 97Z" fill="${paint}"/>${eyes(44, 76, 65)}${smile}<path d="M32 46 Q45 39 51 44" stroke="var(--hs-light)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
  ember: paint =>
    `<g class="hs-head"><path d="M60 9 Q83 26 78 48 Q92 45 93 31 Q117 68 99 101 Q85 122 59 124 Q21 121 17 91 Q11 66 36 44 Q31 66 43 65 Q57 58 49 37 Q43 22 60 9Z" fill="${paint}"/><path d="M42 99 Q36 86 44 77 Q50 96 60 86 Q72 74 69 57 Q99 96 76 114 Q52 125 42 99Z" fill="var(--hs-accent)"/>${eyes(43, 77, 67)}${smile}</g><circle cx="22" cy="28" r="3" fill="var(--hs-accent)"/><circle cx="100" cy="15" r="4" fill="var(--hs-fur)"/>`,
  ripple: paint =>
    `<g class="hs-head"><path d="M64 9 Q59 34 89 59 Q117 89 91 112 Q58 137 29 111 Q5 88 33 55 Q53 32 64 9Z" fill="${paint}"/><path d="M37 59 Q23 75 28 87" fill="none" stroke="var(--hs-light)" stroke-width="7" stroke-linecap="round" opacity=".7"/><path d="M39 112 Q65 126 87 104" fill="none" stroke="var(--hs-accent)" stroke-width="5" stroke-linecap="round"/>${eyes(45, 77, 76)}<path d="M54 92 Q61 99 68 92" fill="none" stroke="var(--hs-light)" stroke-width="3" stroke-linecap="round"/></g>`,
  mochi: paint =>
    `<g class="hs-head"><path d="M13 94 C8 62 28 36 49 40 C68 12 99 38 94 63 C118 72 115 110 93 116 C72 130 53 116 40 122 C18 129 8 112 13 94Z" fill="${paint}"/><path d="M30 55 Q40 43 50 49" fill="none" stroke="var(--hs-light)" stroke-width="6" stroke-linecap="round" opacity=".7"/>${eyes(45, 77, 69)}<ellipse cx="30" cy="83" rx="8" ry="4" fill="var(--hs-accent)"/><ellipse cx="91" cy="83" rx="8" ry="4" fill="var(--hs-accent)"/>${smile}</g>`,
  halo: paint =>
    `<g class="hs-head"><path fill-rule="evenodd" d="M60 17 A49 49 0 1 1 59.9 17Z M60 73 A17 17 0 1 0 60.1 73Z" fill="${paint}"/><path d="M24 49 Q38 17 71 27" stroke="var(--hs-accent)" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M87 99 Q98 87 99 76" stroke="var(--hs-light)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>${eyes(43, 77, 48)}<path d="M55 65 Q60 69 65 65" stroke="var(--hs-light)" stroke-width="2.5" fill="none"/></g><circle class="hs-tail" cx="22" cy="116" r="6" fill="var(--hs-accent)"/>`,
  comet: paint =>
    `<path class="hs-tail" d="M57 76 Q99 74 110 19 Q108 83 80 115 L48 121Z" fill="var(--hs-accent)"/><path d="M68 90 Q97 73 102 48 Q99 94 71 120" fill="var(--hs-light)" opacity=".7"/><g class="hs-head"><circle cx="48" cy="67" r="37" fill="${paint}"/><path d="M24 48 Q32 33 50 36" stroke="var(--hs-light)" stroke-width="4" opacity=".7" fill="none" stroke-linecap="round"/>${eyes(33, 63, 62)}<path d="M41 80 Q48 86 55 80" stroke="var(--hs-light)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
  pixel: paint =>
    `<path d="M29 97 H48 V124 H29Z M72 97 H91 V124 H72Z" fill="var(--hs-accent)"/><g class="hs-head"><path d="M30 23 H73 V35 H96 V57 H107 V89 H94 V104 H26 V91 H13 V58 H24 V35 H30Z" fill="${paint}"/><path d="M30 23 H73 V35 H42 V47 H24 V35 H30Z M83 79 H107 V89 H94 V104 H72 V92 H83Z" fill="var(--hs-accent)"/><path d="M37 49 H82 V83 H37Z" fill="var(--hs-fur)"/>${eyes(44, 76, 64)}<path d="M53 82 V87 H67 V82" stroke="var(--hs-light)" stroke-width="3" fill="none"/></g>`,
  tangle: paint =>
    `<g class="hs-head"><path d="M30 77 C-2 43 44 11 67 42 C100 3 131 57 91 79 C122 113 71 138 55 100 C20 132 -3 91 30 77Z" fill="none" stroke="var(--hs-fur)" stroke-width="20"/><path d="M30 77 C-2 43 44 11 67 42" fill="none" stroke="var(--hs-accent)" stroke-width="10" stroke-linecap="round"/><path d="M91 79 C122 113 71 138 55 100" fill="none" stroke="var(--hs-light)" stroke-width="8" stroke-linecap="round"/><ellipse cx="61" cy="66" rx="32" ry="28" fill="${paint}"/>${eyes(46, 76, 61)}<path d="M55 78 Q61 82 67 78" stroke="var(--hs-light)" stroke-width="3" fill="none"/></g>`,
  luna: paint =>
    `<g class="hs-head"><path d="M80 14 C26 2 -2 58 25 96 C44 126 85 129 108 102 C64 114 56 97 58 78 C39 66 42 35 80 14Z" fill="${paint}"/><path d="M32 31 Q11 56 26 84" stroke="var(--hs-accent)" stroke-width="5" fill="none" stroke-linecap="round"/>${eyes(30, 49, 78)}<path d="M34 95 Q41 102 48 95" stroke="var(--hs-light)" stroke-width="3" fill="none" stroke-linecap="round"/></g><path class="hs-tail" d="M89 43 L93 53 104 56 93 60 89 71 85 60 74 56 85 53Z" fill="var(--hs-accent)"/>`,
  shroom: paint =>
    `<g class="hs-head"><path d="M40 60 L34 111 Q33 129 60 128 Q87 130 86 111 L79 60Z" fill="var(--hs-light)"/><path d="M12 65 Q9 20 60 14 Q110 19 109 65 Q60 87 12 65Z" fill="${paint}"/><ellipse cx="37" cy="40" rx="10" ry="7" fill="var(--hs-accent)" transform="rotate(-25 37 40)"/><ellipse cx="77" cy="34" rx="12" ry="7" fill="var(--hs-accent)" transform="rotate(20 77 34)"/><ellipse cx="91" cy="56" rx="6" ry="4" fill="var(--hs-light)"/>${eyes(46, 74, 86)}<path d="M54 102 Q60 108 66 102" stroke="var(--hs-fur)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
  echo: paint =>
    `<g class="hs-head"><rect x="9" y="51" width="14" height="40" rx="7" fill="var(--hs-accent)"/><rect x="27" y="31" width="16" height="80" rx="8" fill="var(--hs-fur)"/><rect x="47" y="16" width="26" height="110" rx="13" fill="${paint}"/><rect x="77" y="30" width="16" height="82" rx="8" fill="var(--hs-fur)"/><rect x="97" y="48" width="14" height="46" rx="7" fill="var(--hs-accent)"/><rect x="27" y="47" width="66" height="43" rx="20" fill="${paint}"/>${eyes(44, 76, 64)}${smile}<path d="M57 24 V34" stroke="var(--hs-light)" stroke-width="3" stroke-linecap="round"/></g>`,
  glint: paint =>
    `<g class="hs-head"><path d="M60 10 L110 66 60 124 10 66Z" fill="${paint}"/><path d="M60 10 L60 37 31 67 10 66Z" fill="var(--hs-accent)"/><path d="M110 66 L60 124 60 99 88 67Z" fill="var(--hs-light)" opacity=".65"/><path d="M60 37 L88 67 60 99 31 67Z" fill="var(--hs-fur)"/>${eyes(44, 76, 63)}${smile}</g><circle cx="14" cy="26" r="4" fill="var(--hs-accent)"/><circle cx="107" cy="111" r="3" fill="var(--hs-accent)"/>`
}

let serial = 0

export function characterSvg(shape: string, bodyColour?: string, face = true): string {
  const selected = parseCharacterShape(shape)

  if (!selected) {
    return ''
  }

  const { kind, palette } = selected
  const [, base, accent, light] = CHARACTER_PALETTES[palette]
  const fur = /^#[\da-f]{6}$/i.test(bodyColour ?? '') ? bodyColour! : base
  const id = `hebri-character-${++serial}`
  const paint = `url(#${id})`
  const crop = ['sage', 'orbit', 'fox', 'owl'].includes(kind) ? '13 5 96 93' : '0 0 120 130'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-hb-character="1" data-hb-math="1" viewBox="${face ? crop : '0 0 120 140'}" width="100%" height="100%"><defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${fur}"/><stop offset="1" stop-color="${fur}" stop-opacity=".8"/></linearGradient></defs><g class="hs-character">${drawings[kind](paint)}</g></svg>`

  return svg
    .replaceAll('var(--hs-fur)', fur)
    .replaceAll('var(--hs-accent)', accent)
    .replaceAll('var(--hs-light)', light)
    .replaceAll('class="hs-iris"', `class="hs-iris" fill="${accent}"`)
}

/** Direct DOM updates on the existing shared, visibility-budgeted face clock. */
export function paintCharacter(svg: SVGSVGElement, mood: string, time: number, gaze?: { x: number; y: number }) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const t = reduced ? 0 : time
  const thinking = mood === 'think' || mood === 'review'
  const working = mood === 'work' || mood === 'run'
  const success = mood === 'jump' || mood === 'wave'
  const error = mood === 'failed'
  const waiting = mood === 'waiting'

  const bounce = reduced
    ? 0
    : success
      ? -Math.abs(Math.sin(t * 4)) * 7
      : working
        ? Math.sin(t * 9) * 1.6
        : Math.sin(t * 1.8) * 1.1

  const tilt = reduced
    ? 0
    : error
      ? Math.sin(t * 7) * 2
      : thinking
        ? -5 + Math.sin(t) * 2
        : waiting
          ? 5
          : Math.sin(t * 0.8) * 1.3

  svg.querySelector('.hs-character')?.setAttribute('transform', `translate(0 ${bounce})`)
  svg.querySelector('.hs-head')?.setAttribute('transform', `rotate(${tilt} 60 68)`)
  svg
    .querySelectorAll<SVGElement>('.hs-look')
    .forEach(n =>
      n.setAttribute(
        'transform',
        `translate(${reduced ? 0 : (gaze?.x ?? Math.sin(t * 0.65) * 1.1)} ${reduced ? 0 : (gaze?.y ?? (thinking ? -2 : Math.sin(t * 0.4) * 0.6))})`
      )
    )
  const blink = !reduced && (t % 4.3 > 4.15 || (success && t % 2 > 1.8))
  svg.querySelectorAll<SVGElement>('.hs-eye').forEach(n => {
    n.style.transformBox = 'fill-box'
    n.style.transformOrigin = 'center'
    n.style.transform = `scaleY(${blink ? 0.08 : error ? 0.65 : waiting ? 0.8 : 1})`
  })
  svg
    .querySelector('.hs-wing')
    ?.setAttribute(
      'transform',
      `rotate(${reduced ? 0 : success ? -35 + Math.sin(t * 7) * 25 : working ? Math.sin(t * 9) * 9 : 0} 88 88)`
    )
  svg
    .querySelector('.hs-tail')
    ?.setAttribute('transform', `rotate(${reduced ? 0 : Math.sin(t * (working ? 6 : 2)) * 5} 82 111)`)
}
