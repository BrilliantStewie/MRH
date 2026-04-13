import React from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const PhilippinesFlag = () => (
  <span
    aria-hidden="true"
    className="inline-flex h-4 w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/5"
  >
    <svg viewBox="0 0 36 24" className="h-full w-full">
      <path fill="#0038A8" d="M12 0h24v12H12z" />
      <path fill="#CE1126" d="M12 12h24v12H12z" />
      <path fill="#FFFFFF" d="M0 0l15.5 12L0 24z" />

      <g fill="#FCD116">
        <g transform="translate(6.1 12)">
          <circle r="2.15" />
          <g>
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(45)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(90)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(135)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(180)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(225)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(270)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
          <g transform="rotate(315)">
            <polygon points="0,-6.1 0.62,-3.45 -0.62,-3.45" />
            <polygon points="-1.2,-5.2 -0.25,-3.55 -1.45,-3.05" />
            <polygon points="1.2,-5.2 0.25,-3.55 1.45,-3.05" />
          </g>
        </g>

        <g transform="translate(3.1 3.65) scale(0.82)">
          <polygon points="0,-1.9 0.56,-0.62 1.95,-0.62 0.84,0.22 1.25,1.58 0,0.82 -1.25,1.58 -0.84,0.22 -1.95,-0.62 -0.56,-0.62" />
        </g>
        <g transform="translate(3.1 20.35) scale(0.82)">
          <polygon points="0,-1.9 0.56,-0.62 1.95,-0.62 0.84,0.22 1.25,1.58 0,0.82 -1.25,1.58 -0.84,0.22 -1.95,-0.62 -0.56,-0.62" />
        </g>
        <g transform="translate(11.15 12) scale(0.82)">
          <polygon points="0,-1.9 0.56,-0.62 1.95,-0.62 0.84,0.22 1.25,1.58 0,0.82 -1.25,1.58 -0.84,0.22 -1.95,-0.62 -0.56,-0.62" />
        </g>
      </g>
    </svg>
  </span>
);

const PhilippinesPhoneField = ({
  value,
  onChange,
  placeholder = "09XXXXXXXXX",
  disabled = false,
  required = false,
  containerClassName = "",
  prefixClassName = "",
  inputClassName = "",
  action = null,
}) => (
  <div className={joinClasses("relative flex items-center gap-3", containerClassName)}>
    <div
      className={joinClasses(
        "inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/80 bg-white px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm",
        prefixClassName
      )}
      aria-label="Philippines"
      title="Philippines"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-50">
        <PhilippinesFlag />
      </span>
      <span className="sr-only">Philippines</span>
      <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] tracking-[0.18em] text-slate-700">
        +63
      </span>
    </div>

    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      pattern="[0-9]*"
      disabled={disabled}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={joinClasses("w-full bg-transparent outline-none", inputClassName)}
    />

    {action}
  </div>
);

export default PhilippinesPhoneField;
