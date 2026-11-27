import { PencilIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  createEmptyProfile,
  normalizeProfile,
  profileHasData,
  profileListFields,
  profileTextFields,
} from '@/features/inbox/profile-utils'
import { ProfileForm } from '@/features/inbox/profile-form'
import { isEmail } from '@/lib/utils'
import type { ChatProfile } from '@/types/api'

interface ProfileCardProps {
  chatId: string
  profile: ChatProfile | null | undefined
}

function ProfileReadView({ profile }: { profile: ChatProfile }) {
  const textRows = profileTextFields.filter((field) => profile[field.key].length > 0)
  const listRows = profileListFields.filter((field) => profile[field.key].length > 0)

  return (
    <div className="mt-3 space-y-3">
      {textRows.length > 0 ? (
        <dl className="divide-y divide-border/60">
          {textRows.map((field) => {
            const value = profile[field.key]
            return (
              <div key={field.key} className="grid gap-0.5 py-1.5">
                <dt className="text-[11px] leading-4 text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-[12px] leading-4 font-medium break-words text-foreground">
                  {field.key === 'email' && isEmail(value) ? (
                    <a href={`mailto:${value}`} className="break-all hover:underline">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : null}

      {listRows.map((field) => (
        <div key={field.key}>
          <h4 className="text-[11px] leading-4 text-muted-foreground">{field.label}</h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={field.label}>
            {profile[field.key].map((item, index) => (
              <li key={`${field.key}-${index}`} className="max-w-full">
                <Badge
                  variant={field.key === 'notes' ? 'outline' : 'neutral'}
                  className="max-w-full shrink text-left leading-4 break-words whitespace-normal"
                >
                  {item}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ProfileCard({ chatId, profile }: ProfileCardProps) {
  const regionId = useId()
  const [editing, setEditing] = useState(false)
  const value = profile ? normalizeProfile(profile) : createEmptyProfile()
  const hasData = profileHasData(value)

  return (
    <section className="border-b border-border px-4 py-4" aria-labelledby={`${regionId}-title`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${regionId}-title`} className="text-[13px] font-semibold text-foreground">
            Datos del cliente
          </h3>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            Información de contacto y contexto comercial.
          </p>
        </div>
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="shrink-0"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3" aria-hidden="true" />
            Editar
          </Button>
        ) : null}
      </div>

      {editing ? (
        <ProfileForm
          chatId={chatId}
          profile={value}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : hasData ? (
        <ProfileReadView profile={value} />
      ) : (
        <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
          Aún no hay datos del cliente. Usa «Editar» para agregarlos.
        </p>
      )}
    </section>
  )
}
