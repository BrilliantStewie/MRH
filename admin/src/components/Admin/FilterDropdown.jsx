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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "flex h-[46px] items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all",
          isOpen
            ? "border-indigo-200 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {Icon && (
          <Icon
            size={15}
            className={isActive ? "text-indigo-500" : "text-slate-400"}
          />
        )}
        <span className="truncate">
          {showLabelPrefix && (
            <span className="mr-1 hidden font-medium text-slate-400 sm:inline">
              {label}:
            </span>
          )}
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={[
            "absolute top-full z-[120] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]",
            alignClass,
            menuClassName || "w-56",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="space-y-1">
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    selected
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {OptionIcon && (
                      <OptionIcon
                        size={14}
                        className={selected ? "text-indigo-500" : "text-slate-400"}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {selected && <Check size={14} className="text-indigo-600" />}
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
