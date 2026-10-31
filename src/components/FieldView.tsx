import type { CSSProperties } from 'react'
import type {
  Field,
  GroupField,
  GroupItemValue,
  GroupValue,
  TrackerField,
  TrackerValue,
} from '../domain/types'
import { isEmptyValue, isGroupValue, isTrackerValue } from '../domain/values'
import { cn } from '../ui/utils'

interface FieldViewProps {
  field: Field
  value: unknown
  hideEmpty?: boolean
  hideLabel?: boolean
}

export function FieldView({
  field,
  value,
  hideEmpty = false,
  hideLabel = false,
}: FieldViewProps) {
  if (hideEmpty && isEmptyValue(field, value)) return null

  const span = Math.min(12, Math.max(1, field.width ?? 12))
  const style = { '--span': span } as CSSProperties

  return (
    <div className={cn('print-field', `print-field--${field.kind}`)} style={style}>
      {hideLabel ? null : (
        <div className="print-field__label">{field.label}</div>
      )}

      {field.kind === 'shortText' ? (
        <div className="print-field__value">
          {typeof value === 'string' && value.trim() ? value : '—'}
        </div>
      ) : null}

      {field.kind === 'longText' ? (
        <div className="print-field__value print-field__value--long">
          {typeof value === 'string' && value.trim() ? value : '—'}
        </div>
      ) : null}

      {field.kind === 'number' ? (
        <div className="print-field__value print-field__value--number">
          {value === null || value === undefined || value === '' ? '—' : String(value)}
        </div>
      ) : null}

      {field.kind === 'tracker' ? (
        <TrackerDisplay field={field} value={value} />
      ) : null}

      {field.kind === 'group' ? (
        <GroupDisplay field={field} value={value} hideEmpty={hideEmpty} />
      ) : null}
    </div>
  )
}

function TrackerDisplay({
  field,
  value,
}: {
  field: TrackerField
  value: unknown
}) {
  const tracker: TrackerValue = isTrackerValue(value) ? value : { boxes: [] }

  return (
    <div className="print-tracker">
      {tracker.boxes.length === 0 ? <span className="muted">—</span> : null}
      {tracker.boxes.map((box, index) => (
        <span
          key={box.id}
          className={cn('print-tracker__box', box.checked && 'is-checked')}
        >
          {field.mode === 'valued' ? box.value ?? index + 1 : ''}
        </span>
      ))}
    </div>
  )
}

function GroupDisplay({
  field,
  value,
  hideEmpty,
}: {
  field: GroupField
  value: unknown
  hideEmpty: boolean
}) {
  const group: GroupValue = isGroupValue(value) ? value : { items: [] }
  const isCompact = field.preset === 'skills' || field.preset === 'consequences'

  const visibleItems = group.items.filter((item) => {
    if (!hideEmpty) return true
    return field.children.some((child) => !isEmptyValue(child, item.values[child.id]))
  })

  if (visibleItems.length === 0) {
    return <div className="print-group__empty">—</div>
  }

  return (
    <div className={cn('print-group', `print-group--${field.preset}`)}>
      {visibleItems.map((item, index) => (
        <GroupItemDisplay
          key={item.id}
          field={field}
          item={item}
          index={index}
          hideEmpty={hideEmpty}
          isCompact={isCompact}
        />
      ))}
    </div>
  )
}

function GroupItemDisplay({
  field,
  item,
  index,
  hideEmpty,
  isCompact,
}: {
  field: GroupField
  item: GroupItemValue
  index: number
  hideEmpty: boolean
  isCompact: boolean
}) {
  return (
    <div className={cn('print-group__item', isCompact && 'print-group__item--compact')}>
      {field.preset === 'tricks' || field.preset === 'custom' ? (
        <div className="print-group__index">{index + 1}</div>
      ) : null}
      <div className="print-group__grid">
        {field.children.map((child) => (
          <FieldView
            key={child.id}
            field={child}
            value={item.values[child.id]}
            hideEmpty={hideEmpty}
            hideLabel={isCompact}
          />
        ))}
      </div>
    </div>
  )
}
