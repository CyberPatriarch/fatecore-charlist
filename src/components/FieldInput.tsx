import { Minus, Plus, Trash2 } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import type {
  Field,
  GroupField,
  GroupItemValue,
  GroupValue,
  TrackerField,
  TrackerValue,
} from '../domain/types'
import { createGroupItem, isGroupValue, isTrackerValue } from '../domain/values'
import { uid } from '../domain/ids'
import { IconButton } from '../ui/Button'
import { cn } from '../ui/utils'

interface FieldInputProps {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
  hideLabel?: boolean
  ariaLabel?: string
}

export function FieldInput({
  field,
  value,
  onChange,
  hideLabel = false,
  ariaLabel,
}: FieldInputProps) {
  const inputId = useId()
  const span = Math.min(12, Math.max(1, field.width ?? 12))
  const style = { '--span': span } as CSSProperties

  return (
    <div className={cn('field', `field--${field.kind}`)} style={style}>
      {hideLabel ? null : (
        <div className="field__label-row">
          <label className="field__label" htmlFor={inputId}>
            {field.label}
          </label>
          {field.hint ? <span className="field__hint">{field.hint}</span> : null}
        </div>
      )}

      {field.kind === 'shortText' ? (
        <input
          id={inputId}
          className="input"
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          aria-label={hideLabel ? ariaLabel ?? field.label : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.kind === 'longText' ? (
        <textarea
          id={inputId}
          className="input textarea"
          rows={field.rows ?? 3}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          aria-label={hideLabel ? ariaLabel ?? field.label : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.kind === 'number' ? (
        <input
          id={inputId}
          className="input input--number"
          type="number"
          inputMode="numeric"
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={field.placeholder}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          step={field.step ?? 1}
          aria-label={hideLabel ? ariaLabel ?? field.label : undefined}
          onChange={(event) => {
            const raw = event.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const parsed = Number(raw)
            onChange(Number.isNaN(parsed) ? null : parsed)
          }}
        />
      ) : null}

      {field.kind === 'tracker' ? (
        <TrackerInput field={field} value={value} onChange={onChange} />
      ) : null}

      {field.kind === 'group' ? (
        <GroupInput field={field} value={value} onChange={onChange} />
      ) : null}
    </div>
  )
}

function TrackerInput({
  field,
  value,
  onChange,
}: {
  field: TrackerField
  value: unknown
  onChange: (value: unknown) => void
}) {
  const tracker: TrackerValue = isTrackerValue(value) ? value : { boxes: [] }

  const toggle = (boxId: string) => {
    onChange({
      boxes: tracker.boxes.map((box) =>
        box.id === boxId ? { ...box, checked: !box.checked } : box,
      ),
    })
  }

  const addBox = () => {
    const maxValue = tracker.boxes.reduce(
      (max, box) => Math.max(max, box.value ?? 0),
      0,
    )
    onChange({
      boxes: [
        ...tracker.boxes,
        {
          id: uid('box'),
          checked: false,
          value: field.mode === 'valued' ? maxValue + 1 : undefined,
        },
      ],
    })
  }

  const removeLast = () => {
    onChange({ boxes: tracker.boxes.slice(0, -1) })
  }

  return (
    <div className="tracker-input">
      <div className="tracker-boxes" role="group" aria-label={field.label}>
        {tracker.boxes.length === 0 ? (
          <span className="muted">Кружков пока нет</span>
        ) : null}
        {tracker.boxes.map((box, index) => (
          <button
            key={box.id}
            type="button"
            className={cn('tracker-box', box.checked && 'is-checked')}
            aria-pressed={box.checked}
            aria-label={`${field.label}, кружок ${index + 1}${box.value !== undefined ? `, значение ${box.value}` : ''}`}
            onClick={() => toggle(box.id)}
          >
            {field.mode === 'valued' ? <span>{box.value ?? index + 1}</span> : null}
          </button>
        ))}
      </div>

      {field.allowAddRemove ? (
        <div className="tracker-actions">
          <IconButton label="Добавить кружок" onClick={addBox}>
            <Plus size={15} />
          </IconButton>
          <IconButton
            label="Убрать последний кружок"
            onClick={removeLast}
            disabled={tracker.boxes.length === 0}
          >
            <Minus size={15} />
          </IconButton>
        </div>
      ) : null}
    </div>
  )
}

function GroupInput({
  field,
  value,
  onChange,
}: {
  field: GroupField
  value: unknown
  onChange: (value: unknown) => void
}) {
  const group: GroupValue = isGroupValue(value) ? value : { items: [] }
  const canChangeRows = field.repeatable && field.allowAddRemove !== false

  const updateChild = (
    item: GroupItemValue,
    childId: string,
    childValue: unknown,
  ) => {
    onChange({
      items: group.items.map((current) =>
        current.id === item.id
          ? { ...current, values: { ...current.values, [childId]: childValue } }
          : current,
      ),
    } satisfies GroupValue)
  }

  const addItem = () => {
    onChange({
      items: [...group.items, createGroupItem(field, group.items.length)],
    } satisfies GroupValue)
  }

  const removeItem = (itemId: string) => {
    onChange({
      items: group.items.filter((item) => item.id !== itemId),
    } satisfies GroupValue)
  }

  const addLabel =
    field.preset === 'skills'
      ? 'Добавить навык'
      : field.preset === 'tricks'
        ? 'Добавить трюк'
        : field.preset === 'consequences'
          ? 'Добавить последствие'
          : 'Добавить строку'

  if (!field.repeatable) {
    const item = group.items[0]
    if (!item) {
      return (
        <div className="group-empty">
          <span className="muted">В группе нет строк</span>
          {field.allowAddRemove !== false ? (
            <button type="button" className="add-row" onClick={addItem}>
              <Plus size={15} /> {addLabel}
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <div className="group-items">
        <div className="group-item__grid">
          {field.children.map((child) => (
            <FieldInput
              key={child.id}
              field={child}
              value={item.values[child.id]}
              onChange={(next) => updateChild(item, child.id, next)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="group-items">
      {group.items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'group-item',
            `group-item--${field.preset}`,
          )}
        >
          <div className="group-item__top">
            <span className="group-item__index">{index + 1}</span>
            {canChangeRows ? (
              <IconButton
                label="Удалить строку"
                variant="danger"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 size={15} />
              </IconButton>
            ) : null}
          </div>
          <div className="group-item__grid">
            {field.children.map((child) => (
              <FieldInput
                key={child.id}
                field={child}
                value={item.values[child.id]}
                hideLabel={field.preset === 'skills' || field.preset === 'consequences'}
                ariaLabel={`${field.label}, строка ${index + 1}, ${child.label}`}
                onChange={(next) => updateChild(item, child.id, next)}
              />
            ))}
          </div>
        </div>
      ))}

      {canChangeRows ? (
        <button type="button" className="add-row" onClick={addItem}>
          <Plus size={15} /> {addLabel}
        </button>
      ) : null}
    </div>
  )
}
