export default function ParameterControl({ label, unit, value, min, max, step, onChange, onReset, format }: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void; onReset?: () => void; format?: (value: number) => string;
}) {
  const id = `control-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return <div className="parameter-control">
    <div className="control-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{format ? format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 3 })} <small>{unit}</small></output></div>
    <div className="control-input"><input id={id} type="range" min={min} max={max} step={step} value={value} aria-label={`${label} (${unit})`} onChange={e => onChange(Number(e.target.value))} />
      {onReset && <button className="reset-parameter" aria-label={`Reset ${label}`} onClick={onReset}>↺</button>}
    </div>
  </div>;
}
