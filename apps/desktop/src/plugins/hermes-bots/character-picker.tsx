import { cn, RowButton } from '@hermes/plugin-sdk'

import { BotFace } from './avatar'
import { CHARACTER_PALETTES, characterShape, HEBRI_CHARACTERS, parseCharacterShape } from './characters'

interface CharacterPickerProps {
  shape: string
  onShape: (shape: string) => void
  onImage: (image: null) => void
}

/** A shape and a palette are saved together in the existing profile appearance. */
export function CharacterPicker({ shape, onShape, onImage }: CharacterPickerProps) {
  const selected = parseCharacterShape(shape)

  const choose = (kind: string, palette: number) => {
    onImage(null)
    onShape(characterShape(kind, palette))
  }

  return (
    <div className="grid justify-items-center gap-3">
      <div className="grid grid-cols-4 gap-1.5">
        {HEBRI_CHARACTERS.map(([name, , kind, palette]) => (
          <RowButton
            aria-label={name}
            aria-pressed={selected?.kind === kind}
            className={cn('flex flex-col items-center gap-1', selected?.kind === kind && 'ring-1 ring-(--ui-accent)')}
            key={kind}
            onClick={() => choose(kind, selected?.palette ?? palette)}
          >
            <BotFace color="" name={name} shape={characterShape(kind, selected?.palette ?? palette)} size={36} />
            <span className="text-xs">{name}</span>
          </RowButton>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {CHARACTER_PALETTES.map(([name, body, accent], palette) => (
          <RowButton
            aria-label={name}
            aria-pressed={selected?.palette === palette}
            className={cn(
              'flex flex-col items-center gap-1',
              selected?.palette === palette && 'ring-1 ring-(--ui-accent)'
            )}
            key={name}
            onClick={() => choose(selected?.kind ?? 'sage', palette)}
          >
            <span aria-hidden className="flex">
              <span style={{ background: body, width: 14, height: 14, borderRadius: '50%' }} />
              <span style={{ background: accent, width: 14, height: 14, borderRadius: '50%' }} />
            </span>
            <span className="text-xs">{name}</span>
          </RowButton>
        ))}
      </div>
    </div>
  )
}
