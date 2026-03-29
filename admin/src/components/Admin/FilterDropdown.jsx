import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const FilterDropdown = ({
  label,
  options,
  value,
  onChange,
  icon: Icon,
  neutralValue,
  align = "right",
  showLabelPrefix = false,
  showMenuHeader = true,
  compact = false,
  ultraCompact = false,
  disableTriggerShadow = false,
  flatTriggerDecorations = false,
  optionListClassName = "",
  triggerClassName = "",
  menuClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(
    (option) => String(option.value) === String(value)
  );
  const selectedLabel = selectedOption?.label || label;
  const inactiveValue =
    neutralValue !== undefined ? neutralValue : options[0]?.value;
  const isActive = String(value) !== String(inactiveValue);
  const alignClass = align === "left" ? "left-0" : "right-0";
  const dropdownTextClass = ultraCompact
    ? "text-[10px]"
    : compact
      ? "text-[11px]"
      : "text-sm";
  const triggerBaseClass = ultraCompact
    ? "group flex h-8 items-center gap-1 rounded-[14px] border px-2 font-normal transition-all duration-200"
    : compact
    ? "group flex h-9 items-center gap-1.5 rounded-[16px] border px-2.5 font-normal transition-all duration-200"
    : "group flex h-[52px] items-center gap-3 rounded-[22px] border px-4 font-normal transition-all duration-200";
  const iconWrapClass = ultraCompact
    ? "h-3.5 w-3.5 rounded-md"
    : compact
      ? "h-4 w-4 rounded-md"
      : "h-8 w-8 rounded-xl";
  const iconSize = ultraCompact ? 9 : compact ? 10 : 15;
  const chevronWrapClass = ultraCompact ? "h-3.5 w-3.5" : compact ? "h-4 w-4" : "h-7 w-7";
  const chevronSize = ultraCompact ? 9 : compact ? 10 : 14;
  const menuBaseClass = ultraCompact
    ? "absolute top-full z-[120] mt-1 overflow-hidden rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.35)]"
    : compact
    ? "absolute top-full z-[120] mt-1.5 overflow-hidden rounded-[16px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]"
    : "absolute top-full z-[120] mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.32)]";
  const menuHeaderClass = ultraCompact
    ? "mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-1"
    : compact
    ? "mb-1 flex items-center gap-2 rounded-lg px-2 py-1"
    : "mb-2 flex items-center gap-3 rounded-2xl px-3.5 py-2.5";
  const optionListClass = ultraCompact
    ? "max-h-40 space-y-1 overflow-y-auto pr-1"
    : compact
      ? "max-h-44 space-y-1 overflow-y-auto pr-1"
      : "max-h-64 space-y-1 overflow-y-auto pr-1";
  const optionButtonClass = ultraCompact
    ? "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left font-normal transition-all"
    : compact
    ? "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left font-normal transition-all"
    : "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left font-normal transition-all";
  const optionIconWrapClass = ultraCompact ? "h-3.5 w-3.5 rounded-md" : compact ? "h-4 w-4 rounded-md" : "h-7 w-7 rounded-xl";
  const optionCheckWrapClass = ultraCompact ? "h-3.5 w-3.5" : compact ? "h-4 w-4" : "h-7 w-7";
  const optionCheckSize = ultraCompact ? 9 : compact ? 10 : 14;
  const triggerIconWrapClass = flatTriggerDecorations
    ? "shrink-0"
    : `shrink-0 ${iconWrapClass}`;
  const triggerChevronWrapClass = flatTriggerDecorations
    ? "shrink-0"
    : `shrink-0 ${chevronWrapClass}`;
  const triggerStateClass = isOpen
    ? disableTriggerShadow
      ? "border-slate-300 bg-white text-slate-800 ring-4 ring-slate-200/70"
      : "border-slate-300 bg-white text-slate-800 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.28)] ring-4 ring-slate-200/70"
    : disableTriggerShadow
      ? "border-slate-200 bg-slate-50/90 text-slate-700 hover:-translate-y-px hover:border-slate-300 hover:bg-white"
      : "border-slate-200 bg-slate-50/90 text-slate-700 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.2)] hover:-translate-y-px hover:border-slate-300 hover:bg-white hover:shadow-[0_20px_38px_-30px_rgba(15,23,42,0.26)]";
  const triggerIconStateClass = flatTriggerDecorations
    ? isOpen || isActive
      ? "text-slate-600"
      : "text-slate-400 group-hover:text-slate-500"
    : isOpen || isActive
      ? "text-slate-600"
      : "text-slate-400 group-hover:text-slate-500";
  const triggerChevronStateClass = flatTriggerDecorations
    ? isOpen
      ? "text-slate-700"
      : "text-slate-400 group-hover:text-slate-500"
    : isOpen
      ? "text-slate-700"
      : "text-slate-400 group-hover:text-slate-500";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          triggerBaseClass,
          triggerStateClass,
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {Icon && (
          <span
            className={`flex items-center justify-center transition-colors ${triggerIconWrapClass} ${triggerIconStateClass}`}
          >
            <Icon size={iconSize} />
          </span>
        )}
          <span className={`min-w-0 flex-1 truncate text-left ${dropdownTextClass}`}>
          {showLabelPrefix && (
            <span className="mr-1 hidden font-normal text-slate-400 sm:inline">
              {label}:
            </span>
          )}
          <span className="truncate font-normal tracking-tight text-slate-800">
            {selectedLabel}
          </span>
        </span>
        <span
          className={`flex items-center justify-center transition-all ${triggerChevronWrapClass} ${triggerChevronStateClass}`}
        >
          <ChevronDown
            size={chevronSize}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {isOpen && (
        <div
          className={[
            menuBaseClass,
            alignClass,
            menuClassName || "w-56",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showMenuHeader && (
            <>
              <div className={menuHeaderClass}>
                {Icon && (
                  <span className="flex shrink-0 items-center justify-center text-slate-400">
                    <Icon size={ultraCompact ? 10 : compact ? 11 : 16} />
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`truncate uppercase tracking-[0.18em] text-slate-400 ${
                      ultraCompact
                        ? "text-[8px] font-normal"
                        : compact
                          ? "text-[9px] font-normal"
                          : "text-[10px] font-medium"
                    }`}
                  >
                    {label}
                  </p>
                  <p className={`truncate font-normal tracking-tight text-slate-700 ${dropdownTextClass}`}>
                    {selectedLabel}
                  </p>
                </div>
              </div>
              <div className={`${compact ? "mx-1 mb-1.5" : "mx-1 mb-2"} h-px bg-slate-100`} />
            </>
          )}

          <div className={[optionListClass, optionListClassName].filter(Boolean).join(" ")}>
            {options.map((option) => {
              const OptionIcon = option.icon;
              const selected = String(value) === String(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`${optionButtonClass} ${
                      selected
                        ? "border-slate-200 bg-slate-100 text-slate-900 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.2)]"
                        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={`flex min-w-0 items-center gap-2 ${dropdownTextClass}`}>
                    {OptionIcon && (
                      <span
                        className={`flex shrink-0 items-center justify-center border ${optionIconWrapClass} ${
                          selected
                            ? "border-slate-200 bg-white text-slate-700"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        <OptionIcon size={ultraCompact ? 10 : compact ? 12 : 14} />
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {selected && (
                    <span className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 ${optionCheckWrapClass}`}>
                      <Check size={optionCheckSize} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
