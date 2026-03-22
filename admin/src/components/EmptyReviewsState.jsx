import React from "react";

const EmptyReviewsState = ({ message = "No reviews found yet.", className = "" }) => {
  return (
    <div
      className={`flex min-h-[220px] w-full max-w-[560px] items-center justify-center rounded-[24px] border border-dashed border-sky-200 bg-white px-8 text-center shadow-sm ${className}`}
    >
      <p className="text-[30px] font-medium italic tracking-tight text-slate-400">
        {message}
      </p>
    </div>
  );
};

export default EmptyReviewsState;
